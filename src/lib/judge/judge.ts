import type { JudgeResult } from "@/types/judge";
import type { Language, Problem } from "@/types/problem";
import { getRunner } from "@/lib/runners/runnerManager";
import { DEFAULT_OUTPUT_LIMIT, DEFAULT_TIMEOUT_MS, MAX_INPUT_BYTES } from "@/lib/runners/types";
import { compareOutput } from "./compareOutput";
import { runnerResultToStatus } from "./status";

/**
 * Judge Engine。
 * テストケースを順番に実行し、最初に失敗したケースで打ち切って結果を返す。
 * 正誤判定は必ずここで行う(AIには任せない)。
 */
export async function judge(problem: Problem, language: Language, code: string): Promise<JudgeResult> {
  const runner = getRunner(language);
  const started = performance.now();
  let passed = 0;

  for (let i = 0; i < problem.tests.length; i++) {
    const test = problem.tests[i];
    const inputBytes = new TextEncoder().encode(test.input).length;
    if (inputBytes > MAX_INPUT_BYTES) {
      return {
        status: "RE",
        passedCount: passed,
        totalCount: problem.tests.length,
        message: "テスト入力が大きすぎます(問題データの不備の可能性があります)",
        elapsedMs: performance.now() - started,
      };
    }

    const result = await runner.run({
      code,
      input: test.input,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      outputLimit: DEFAULT_OUTPUT_LIMIT,
    });

    if (result.type !== "success") {
      return {
        status: runnerResultToStatus(result.type),
        passedCount: passed,
        totalCount: problem.tests.length,
        failedCase: {
          index: i,
          input: test.input,
          expected: test.expected,
          actual: result.stdout,
          errorMessage: result.stderr || undefined,
        },
        message: result.stderr || undefined,
        elapsedMs: performance.now() - started,
      };
    }

    if (!compareOutput(result.stdout, test.expected)) {
      return {
        status: "WA",
        passedCount: passed,
        totalCount: problem.tests.length,
        failedCase: {
          index: i,
          input: test.input,
          expected: test.expected,
          actual: result.stdout,
        },
        elapsedMs: performance.now() - started,
      };
    }
    passed++;
  }

  return {
    status: "AC",
    passedCount: passed,
    totalCount: problem.tests.length,
    elapsedMs: performance.now() - started,
  };
}
