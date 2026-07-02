import type { LanguageRunner, RunnerResult, RunParams } from "./types";

/**
 * Python Runner (Pyodide)。
 * - Pyodide は CDN から Web Worker 内に読み込む(初回のみ数十MBのダウンロードが発生)
 * - input() はテスト入力の行を順番に返すように差し替える
 * - print() の出力は sys.stdout の差し替えで収集する
 * - タイムアウト時は worker ごと terminate し、次回実行時に再初期化する
 */
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const workerSource = `
importScripts("${PYODIDE_CDN}pyodide.js");

let pyodideReadyPromise = loadPyodide({ indexURL: "${PYODIDE_CDN}" });

self.onmessage = async function (e) {
  const { id, code, input, outputLimit } = e.data;
  try {
    const pyodide = await pyodideReadyPromise;
    pyodide.globals.set("__user_code__", code);
    pyodide.globals.set("__stdin_text__", input);
    pyodide.globals.set("__output_limit__", outputLimit);
    const result = await pyodide.runPythonAsync(\`
import sys, io, json, builtins, traceback

class _LimitedIO(io.StringIO):
    def __init__(self, limit):
        super().__init__()
        self._limit = limit
        self.overflow = False
    def write(self, s):
        if self.tell() + len(s) > self._limit:
            self.overflow = True
            raise SystemExit("OUTPUT_LIMIT")
        return super().write(s)

_lines = iter(__stdin_text__.split("\\\\n"))
def _fake_input(prompt=""):
    try:
        return next(_lines)
    except StopIteration:
        raise EOFError("入力がこれ以上ありません")

_out = _LimitedIO(__output_limit__)
_old_stdout, _old_stderr, _old_input = sys.stdout, sys.stderr, builtins.input
sys.stdout = _out
sys.stderr = io.StringIO()
builtins.input = _fake_input
_status = "success"
_err = ""
try:
    _g = {"__name__": "__main__"}
    exec(compile(__user_code__, "main.py", "exec"), _g)
except SyntaxError:
    _status = "compile-error"
    _err = traceback.format_exc(limit=0)
except SystemExit as e:
    if _out.overflow:
        _status = "output-limit"
    elif e.code not in (None, 0):
        _status = "runtime-error"
        _err = "SystemExit: " + str(e.code)
except BaseException:
    _status = "runtime-error"
    _err = traceback.format_exc(limit=3)
finally:
    sys.stdout = _old_stdout
    _err = _err + sys.stderr.getvalue() if _status != "success" else _err
    sys.stderr = _old_stderr
    builtins.input = _old_input

json.dumps({"type": _status, "stdout": _out.getvalue(), "stderr": _err})
\`);
    self.postMessage({ id, result: JSON.parse(result) });
  } catch (err) {
    self.postMessage({ id, result: { type: "runtime-error", stdout: "", stderr: String(err) } });
  }
};

self.postMessage({ ready: true });
`;

let cachedWorker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let messageId = 0;

function getWorker(): { worker: Worker; ready: Promise<void> } {
  if (!cachedWorker) {
    const blob = new Blob([workerSource], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    cachedWorker = worker;
    workerReady = new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        if (e.data?.ready) {
          worker.removeEventListener("message", onMessage);
          resolve();
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (e) => reject(new Error(e.message || "Pyodideの読み込みに失敗しました")), { once: true });
    });
  }
  return { worker: cachedWorker, ready: workerReady! };
}

function resetWorker() {
  cachedWorker?.terminate();
  cachedWorker = null;
  workerReady = null;
}

async function runPython({ code, input, timeoutMs, outputLimit }: RunParams): Promise<RunnerResult> {
  const { worker, ready } = getWorker();
  const started = performance.now();

  // Pyodide本体の初期化はタイムアウトに含めない(初回は数十秒かかりうる)
  await ready;

  const id = ++messageId;
  return new Promise<RunnerResult>((resolve) => {
    const timer = setTimeout(() => {
      resetWorker();
      resolve({ type: "timeout", stdout: "", stderr: "", elapsedMs: performance.now() - started });
    }, timeoutMs);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      const { type, stdout, stderr } = e.data.result;
      resolve({ type, stdout, stderr, elapsedMs: performance.now() - started });
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, code, input, outputLimit });
  });
}

export const pythonRunner: LanguageRunner = {
  language: "python",
  isAvailable: async () => typeof Worker !== "undefined",
  run: runPython,
  warmup: async () => {
    const { ready } = getWorker();
    await ready;
  },
};
