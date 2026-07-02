import type { LanguageRunner, RunnerResult, RunParams } from "./types";

/**
 * JavaScript Runner。
 * Web Worker内で実行するため、無限ループでもUIは固まらず、timeoutでterminateできる。
 * - 標準入力: グローバル変数 `input`(全文字列) と `readLine()` 関数で渡す
 * - 標準出力: console.log をフックして収集する
 */
const workerSource = `
self.onmessage = function (e) {
  const { code, input, outputLimit } = e.data;
  const lines = input.split("\\n");
  let lineIndex = 0;
  let out = [];
  let outLen = 0;
  let overflow = false;

  function push(args) {
    if (overflow) return;
    const text = args.map(function (a) {
      if (typeof a === "object") { try { return JSON.stringify(a); } catch { return String(a); } }
      return String(a);
    }).join(" ");
    outLen += text.length + 1;
    out.push(text);
    if (outLen > outputLimit) {
      overflow = true;
      self.postMessage({ type: "output-limit", stdout: out.join("\\n"), stderr: "" });
      self.close();
    }
  }

  const console2 = { log: function () { push([].slice.call(arguments)); },
                     error: function () { push([].slice.call(arguments)); },
                     warn: function () { push([].slice.call(arguments)); },
                     info: function () { push([].slice.call(arguments)); } };

  function readLine() { return lineIndex < lines.length ? lines[lineIndex++] : ""; }

  try {
    const fn = new Function("console", "input", "readLine", "require", "process", code);
    fn(console2, input, readLine, undefined, undefined);
    self.postMessage({ type: "success", stdout: out.join("\\n"), stderr: "" });
  } catch (err) {
    self.postMessage({ type: "runtime-error", stdout: out.join("\\n"), stderr: (err && err.stack) ? String(err.message || err) : String(err) });
  }
};
`;

async function runJavaScript({ code, input, timeoutMs, outputLimit }: RunParams): Promise<RunnerResult> {
  const blob = new Blob([workerSource], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  const started = performance.now();

  return new Promise<RunnerResult>((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ type: "timeout", stdout: "", stderr: "", elapsedMs: performance.now() - started });
    }, timeoutMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      const { type, stdout, stderr } = e.data;
      resolve({ type, stdout, stderr, elapsedMs: performance.now() - started });
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      // Workerのロード時エラー(構文エラー等)はREとして扱う
      resolve({ type: "runtime-error", stdout: "", stderr: e.message || "実行エラー", elapsedMs: performance.now() - started });
    };

    worker.postMessage({ code, input, outputLimit });
  });
}

export const javascriptRunner: LanguageRunner = {
  language: "javascript",
  isAvailable: async () => typeof Worker !== "undefined",
  run: runJavaScript,
};
