import { htmlRunner } from "@/lib/runners/htmlRunner";
import { DEFAULT_OUTPUT_LIMIT } from "@/lib/runners/types";
import { serializeCheck, type HtmlCheck } from "./htmlChecks";

export type BuildHtmlTestsResult =
  | { ok: true; tests: Array<{ input: string; expected: string }> }
  | { ok: false; reason: string };

/** 何も書いていないページ。これで通ってしまうチェックは意味が無い。 */
const EMPTY_PAGE = '<!doctype html><html lang="ja"><head><meta charset="utf-8"></head><body></body></html>';

/**
 * HTML問題のテストを作る。
 *
 * 期待値はチェックの説明文そのもの。合格したRunnerも同じ説明文を返すので、
 * 結果画面の「期待する出力 / あなたの出力」が日本語で読める。
 *
 * ここで2つのことを確かめる:
 * 1. 模範解答のHTMLで全チェックが通ること(問題と解答が食い違っていないか)
 * 2. 空のページでは少なくとも1つ落ちること
 *    (全部通ってしまうと、何も書かない答えが正解になってしまう)
 */
export async function buildHtmlTests(
  checks: HtmlCheck[],
  referenceHtml: string,
): Promise<BuildHtmlTestsResult> {
  const tests: Array<{ input: string; expected: string }> = [];

  for (const check of checks) {
    const input = serializeCheck(check);
    const result = await htmlRunner.run({
      code: referenceHtml,
      input,
      timeoutMs: 5000, // 模範解答の確認は利用者の提出より緩めにする
      outputLimit: DEFAULT_OUTPUT_LIMIT,
    });

    if (result.type !== "success") {
      return {
        ok: false,
        reason: `模範解答のHTMLでチェック「${check.description}」を確認できませんでした(${result.type})`,
      };
    }
    if (result.stdout !== check.description) {
      return {
        ok: false,
        reason: `模範解答のHTMLがチェック「${check.description}」を満たしていません(実際: ${result.stdout})。[CHECKS]と[HTML]を合わせてください`,
      };
    }
    tests.push({ input, expected: check.description });
  }

  const emptyResults = await Promise.all(
    checks.map((check) =>
      htmlRunner.run({
        code: EMPTY_PAGE,
        input: serializeCheck(check),
        timeoutMs: 5000,
        outputLimit: DEFAULT_OUTPUT_LIMIT,
      }),
    ),
  );
  const passesOnEmptyPage = emptyResults.every(
    (result, i) => result.type === "success" && result.stdout === checks[i].description,
  );
  if (passesOnEmptyPage) {
    return {
      ok: false,
      reason:
        "空のページでも[CHECKS]が全部通ってしまいます。何も書かなくても正解になるので、ページの中身を確かめるチェックにしてください",
    };
  }

  return { ok: true, tests };
}
