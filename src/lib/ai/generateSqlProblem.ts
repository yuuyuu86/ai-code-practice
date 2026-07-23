import type { GenerateProblemInput, Problem } from "@/types/problem";
import { chat } from "./webllmClient";
import { buildSqlProblemPrompt } from "./sqlPrompts";
import { checkSqlProblem, parseSqlProblem } from "@/lib/problem/sqlProblem";
import { buildSqlTests } from "@/lib/problem/buildSqlTests";
import { findForbiddenPattern, findNonJapaneseReason } from "@/lib/problem/validateProblem";
import { cacheAIProblem, saveGeneratedProblem } from "@/lib/storage/problems";
import type { GenerateProgress } from "./generateProblem";

const MAX_ATTEMPTS = 5;

export type SqlGenerateOutcome =
  | { ok: true; problem: Problem }
  | { ok: false; failureReason: string };

/**
 * SQL問題を生成する。
 *
 * 標準入出力の問題とは採点の形が違うので、生成も別経路にしている。
 * ただし方針は同じで、期待する出力はAIに書かせず、
 * 模範解答のSELECTをSQLite(sql.js)で実行して作る。
 *
 * SQL問題はテキスト量が少ないので、他言語のような3段階生成はせず1回で作らせ、
 * 検証に落ちたら理由を添えて作り直させる。
 */
export async function generateSqlProblem(
  input: GenerateProblemInput,
  onProgress?: (p: GenerateProgress) => void,
): Promise<SqlGenerateOutcome> {
  let failureReason: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onProgress?.({ phase: "drafting-details", attempt });
    const prompt = buildSqlProblemPrompt(input, failureReason);
    const response = await chat(
      [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      {
        temperature: attempt === 1 ? 0.3 : 0.5,
        maxTokens: 1200,
        onProgress: (detail) => onProgress?.({ phase: "loading-model", detail }),
      },
    );

    onProgress?.({ phase: "validating", attempt });
    const raw = parseSqlProblem(response);

    const structure = checkSqlProblem(raw);
    if (!structure.ok) {
      failureReason = structure.reason;
      console.warn(`[generateSqlProblem] 試行${attempt} 構造検証NG: ${structure.reason}\n生出力:\n`, response);
      continue;
    }

    // 日本語で書くべき箇所のチェックは標準入出力の問題と同じ基準を使う
    const japanese = findNonJapaneseReason(`${raw.title}\n${raw.statement}\n${raw.explanation}`);
    if (japanese) {
      failureReason = japanese;
      console.warn(`[generateSqlProblem] 試行${attempt} 日本語チェックNG: ${japanese}`);
      continue;
    }
    const forbidden = findForbiddenPattern(`${raw.title}\n${raw.statement}`);
    if (forbidden) {
      failureReason = forbidden;
      console.warn(`[generateSqlProblem] 試行${attempt} 禁止表現: ${forbidden}`);
      continue;
    }

    onProgress?.({ phase: "building-tests", attempt });
    const tests = await buildSqlTests(raw);
    if (!tests.ok) {
      failureReason = tests.reason;
      console.warn(`[generateSqlProblem] 試行${attempt} テスト生成NG: ${tests.reason}`);
      continue;
    }

    const problem: Problem = {
      id: crypto.randomUUID(),
      title: raw.title,
      difficulty: input.difficulty,
      topic: input.topic,
      // SQL問題は他の言語では解けない
      supportedLanguages: ["sql"],
      statement: raw.statement,
      inputFormat: `テーブル: ${raw.schemaText}`,
      outputFormat: "SELECTの結果(1行目が列名、2行目以降が値のタブ区切り)を答えとします。",
      constraints: [],
      samples: [{ input: raw.setups[0], output: tests.tests[0].expected }],
      testInputs: raw.setups,
      tests: tests.tests,
      referenceSolutions: { python: "", sql: raw.referenceSql },
      hints: raw.hints,
      explanation: raw.explanation,
      createdAt: new Date().toISOString(),
    };

    await saveGeneratedProblem(problem);
    await cacheAIProblem(problem, "sql");
    return { ok: true, problem };
  }

  return { ok: false, failureReason: failureReason ?? "SQL問題を生成できませんでした" };
}
