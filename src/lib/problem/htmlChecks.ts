/**
 * HTML+CSS+JS問題のチェック定義。
 *
 * この言語は「出力」が無いので、出力比較では採点できない。
 * 代わりに、書いたページを実際に描画してDOMを調べる。
 * 調べ方の種類は下の5つに限定している。種類を絞ることで
 *  - 小型モデルでも正しい形で書ける
 *  - こちらで妥当性を検証できる
 * の両方が成り立つ。
 */
export type HtmlCheck =
  | { kind: "exists"; selector: string; description: string }
  | { kind: "count"; selector: string; value: string; description: string }
  | { kind: "text"; selector: string; value: string; description: string }
  | { kind: "attr"; selector: string; name: string; value: string; description: string }
  | { kind: "style"; selector: string; name: string; value: string; description: string };

/**
 * 1行1チェックの「種類 | セレクタ | ... | 説明」形式を読む。
 * JSONにしないのは、小型モデルがエスケープを壊しやすいため(他の問題形式と同じ理由)。
 */
export function parseHtmlChecks(raw: string | undefined): HtmlCheck[] {
  const checks: HtmlCheck[] = [];
  for (const line of (raw ?? "").split("\n")) {
    const cleaned = line.replace(/^\s*[-*・]\s*/, "").trim();
    if (cleaned === "") continue;
    const parts = cleaned.split("|").map((p) => p.trim());
    const kind = parts[0]?.toLowerCase();

    if (kind === "exists" && parts.length >= 3) {
      checks.push({ kind: "exists", selector: parts[1], description: parts[2] });
    } else if (kind === "count" && parts.length >= 4) {
      checks.push({ kind: "count", selector: parts[1], value: parts[2], description: parts[3] });
    } else if (kind === "text" && parts.length >= 4) {
      checks.push({ kind: "text", selector: parts[1], value: parts[2], description: parts[3] });
    } else if ((kind === "attr" || kind === "style") && parts.length >= 5) {
      checks.push({ kind, selector: parts[1], name: parts[2], value: parts[3], description: parts[4] });
    }
  }
  return checks;
}

/** チェック1件を、Runnerに渡す1行のテキストにする(tests[i].inputになる) */
export function serializeCheck(check: HtmlCheck): string {
  switch (check.kind) {
    case "exists":
      return ["exists", check.selector, check.description].join("|");
    case "count":
    case "text":
      return [check.kind, check.selector, check.value, check.description].join("|");
    case "attr":
    case "style":
      return [check.kind, check.selector, check.name, check.value, check.description].join("|");
  }
}

/** serializeCheckの逆。Runner側で使う。 */
export function deserializeCheck(line: string): HtmlCheck | null {
  return parseHtmlChecks(line)[0] ?? null;
}

export const MIN_HTML_CHECKS = 3;

export type HtmlCheckValidation = { ok: true } | { ok: false; reason: string };

/**
 * チェック一覧の形が妥当か。
 * セレクタが壊れていないかはここでは見ない。模範解答に対して実際に流したときに
 * 失敗するので、そちらで弾ける(DOMに依存しないぶんテストしやすい)。
 */
export function checkHtmlCheckList(checks: HtmlCheck[]): HtmlCheckValidation {
  if (checks.length < MIN_HTML_CHECKS) {
    return {
      ok: false,
      reason: `[CHECKS]が${checks.length}個しかありません。「種類|セレクタ|…|説明」の形で${MIN_HTML_CHECKS}個以上書いてください`,
    };
  }
  for (const check of checks) {
    if (check.description.trim().length < 4) {
      return { ok: false, reason: "各チェックの最後には、何を確かめているかの説明を日本語で書いてください" };
    }
    if (check.kind === "count" && !/^\d+$/.test(check.value)) {
      return { ok: false, reason: "countのチェックは個数を数字で書いてください" };
    }
  }
  // 同じ内容のチェックを並べても採点は厳しくならない
  const serialized = checks.map(serializeCheck);
  if (new Set(serialized).size !== serialized.length) {
    return { ok: false, reason: "[CHECKS]に同じチェックが重複しています" };
  }
  return { ok: true };
}
