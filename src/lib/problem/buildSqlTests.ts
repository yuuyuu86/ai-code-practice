import { sqlRunner } from "@/lib/runners/sqlRunner";
import { DEFAULT_OUTPUT_LIMIT } from "@/lib/runners/types";
import type { RawSqlProblem } from "./sqlProblem";

export type BuildSqlTestsResult =
  | { ok: true; tests: Array<{ input: string; expected: string }> }
  | { ok: false; reason: string };

/**
 * SQL問題の期待出力を作る。
 *
 * 他言語と同じ方針で、AIが書いた期待出力は使わない。
 * [SETUPS] の各データに対して模範解答のSELECTをSQLiteで実行し、その結果を期待出力にする。
 *
 * あわせて「データを変えても結果が変わらない問題」を弾く。
 * 全ケースで同じ結果になる問題は、その結果を直接書いたSELECTでも正解になってしまう。
 */
export async function buildSqlTests(raw: RawSqlProblem): Promise<BuildSqlTestsResult> {
  const tests: Array<{ input: string; expected: string }> = [];

  for (const setup of raw.setups) {
    const result = await sqlRunner.run({
      code: raw.referenceSql,
      input: setup,
      timeoutMs: 5000, // 模範解答の実行は利用者の提出より緩めにする
      outputLimit: DEFAULT_OUTPUT_LIMIT,
    });

    if (result.type !== "success") {
      return {
        ok: false,
        reason: `模範解答のSQLがデータ「${truncate(setup)}」で実行できませんでした(${result.type}): ${truncate(result.stderr)}。テーブル名と列名を[SETUPS]と合わせてください`,
      };
    }
    // SELECTなら該当0行でも列名の行が出る。完全に空なのはSELECT以外を書いた場合。
    if (result.stdout === "") {
      return {
        ok: false,
        reason: `模範解答のSQLがデータ「${truncate(setup)}」で結果を返しませんでした。SELECT文にしてください`,
      };
    }
    tests.push({ input: setup, expected: result.stdout });
  }

  // 1件でも結果が違えば、データに応じて答えが変わる問題になっている
  const distinct = new Set(tests.map((t) => t.expected));
  if (distinct.size < 2) {
    return {
      ok: false,
      reason:
        "どのデータでも同じ結果になりました。[SETUPS]のデータを変えて、答えが変わるようにしてください(結果を直接書いたSELECTでも通ってしまいます)",
    };
  }

  return { ok: true, tests };
}

function truncate(text: string, max = 80): string {
  const t = text.replace(/\n/g, " ");
  return t.length > max ? t.slice(0, max) + "…" : t;
}
