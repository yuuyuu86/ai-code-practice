import type { LanguageRunner, RunnerResult, RunParams } from "./types";

/**
 * HTML+CSS+JS Runner。
 *
 * この言語には「出力」が無いので、書いたページを実際に描画して
 * DOMを1項目ずつ調べる方式で採点する。
 * RunParams.input にチェック1件("種類|セレクタ|…|説明")が入り、
 * 合格ならその説明文を、不合格なら実際にどうだったかを stdout に返す。
 * 説明文がそのまま期待値になるので、結果画面が日本語で読める。
 *
 * 描画には sandbox="allow-scripts" のiframeを使う。
 * allow-same-origin は付けない。付けると利用者のスクリプトから
 * このアプリのIndexedDBやlocalStorageに触れてしまうため。
 * 代わりに、調べる処理そのものをiframeの中に入れて、結果だけpostMessageで受け取る。
 */

/** iframe内に差し込む採点スクリプト。__CHECK__ と __NONCE__ を差し替えて使う。 */
const CHECKER_TEMPLATE = `
<script>
(function () {
  var check = __CHECK__;
  var nonce = "__NONCE__";

  function send(ok, actual) {
    parent.postMessage({ nonce: nonce, ok: ok, actual: actual }, "*");
  }

  function normalizeStyleValue(name, value) {
    // color: red と rgb(255, 0, 0) を同じものとして扱えるように、
    // 一度ブラウザに解釈させてから比べる。
    var probe = document.createElement("div");
    probe.style.setProperty(name, value);
    document.body.appendChild(probe);
    var resolved = getComputedStyle(probe).getPropertyValue(name).trim();
    probe.parentNode.removeChild(probe);
    return resolved === "" ? value.trim() : resolved;
  }

  function run() {
    var nodes;
    try {
      nodes = document.querySelectorAll(check.selector);
    } catch (err) {
      send(false, "セレクタ「" + check.selector + "」が正しくありません");
      return;
    }

    if (check.kind === "count") {
      var want = Number(check.value);
      send(nodes.length === want, nodes.length + "個でした");
      return;
    }

    if (nodes.length === 0) {
      send(false, "「" + check.selector + "」が見つかりませんでした");
      return;
    }
    var el = nodes[0];

    if (check.kind === "exists") {
      send(true, check.description);
      return;
    }
    if (check.kind === "text") {
      var text = (el.textContent || "").replace(/\\s+/g, " ").trim();
      send(text === check.value.trim(), "文字は「" + text + "」でした");
      return;
    }
    if (check.kind === "attr") {
      var attr = el.getAttribute(check.name);
      if (attr === null) { send(false, check.name + "属性がありませんでした"); return; }
      send(attr.trim() === check.value.trim(), check.name + "属性は「" + attr + "」でした");
      return;
    }
    if (check.kind === "style") {
      var actual = getComputedStyle(el).getPropertyValue(check.name).trim();
      var want2 = normalizeStyleValue(check.name, check.value);
      send(actual === want2, check.name + "は「" + actual + "」でした");
      return;
    }
    send(false, "不明なチェックです");
  }

  function start() {
    // 利用者のスクリプトが読み込み後にDOMをいじることがあるので、少し待ってから調べる。
    // requestAnimationFrameは使えない: このiframeは画面外にあって描画されないので発火しない。
    // (getComputedStyleは描画されていなくても正しい値を返す)
    setTimeout(function () { setTimeout(function () {
      try { run(); } catch (err) { send(false, "確認中にエラーが起きました: " + String(err)); }
    }, 0); }, 0);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") start();
  else document.addEventListener("DOMContentLoaded", start);
})();
<\/script>
`;

type ParsedCheck = {
  kind: string;
  selector: string;
  name?: string;
  value?: string;
  description: string;
};

function parseCheckLine(line: string): ParsedCheck | null {
  const parts = line.split("|").map((p) => p.trim());
  const kind = parts[0]?.toLowerCase();
  if (kind === "exists" && parts.length >= 3) return { kind, selector: parts[1], description: parts[2] };
  if ((kind === "count" || kind === "text") && parts.length >= 4) {
    return { kind, selector: parts[1], value: parts[2], description: parts[3] };
  }
  if ((kind === "attr" || kind === "style") && parts.length >= 5) {
    return { kind, selector: parts[1], name: parts[2], value: parts[3], description: parts[4] };
  }
  return null;
}

async function runHtml({ code, input, timeoutMs }: RunParams): Promise<RunnerResult> {
  const started = performance.now();
  const check = parseCheckLine(input);
  if (!check) {
    return {
      type: "runtime-error",
      stdout: "",
      stderr: "チェックの形式が正しくありません(問題データの不備の可能性があります)",
      elapsedMs: performance.now() - started,
    };
  }

  const nonce = crypto.randomUUID();
  const checker = CHECKER_TEMPLATE.replace("__CHECK__", JSON.stringify(check)).replace("__NONCE__", nonce);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("aria-hidden", "true");
  // 画面には出さないが、レイアウトが潰れるとgetComputedStyleの結果が変わるので大きさは持たせる
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;visibility:hidden;";
  iframe.srcdoc = `${code}\n${checker}`;

  return new Promise<RunnerResult>((resolve) => {
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      iframe.remove();
    };
    const finish = (result: Omit<RunnerResult, "elapsedMs">) => {
      cleanup();
      resolve({ ...result, elapsedMs: performance.now() - started });
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { nonce?: string; ok?: boolean; actual?: string } | null;
      if (!data || data.nonce !== nonce) return;
      // 合格なら説明文をそのまま返す。期待値も同じ説明文なので一致する。
      finish({ type: "success", stdout: data.ok ? check.description : (data.actual ?? "確認できませんでした"), stderr: "" });
    };

    const timer = setTimeout(
      () => finish({ type: "timeout", stdout: "", stderr: "ページの表示が終わりませんでした" }),
      timeoutMs + 3000,
    );

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

export const htmlRunner: LanguageRunner = {
  language: "html",
  isAvailable: async () => typeof document !== "undefined",
  run: runHtml,
};
