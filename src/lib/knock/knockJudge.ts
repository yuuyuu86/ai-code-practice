import type { KnockProblem } from "@/data/knock100";
import { KNOCK_TEST_INPUTS } from "@/data/knockTests";
import { KNOCK_PROPERTY_CHECKS } from "@/data/knockChecks";
import { compareOutput } from "@/lib/judge/compareOutput";
import { getRunner } from "@/lib/runners/runnerManager";
import { DEFAULT_OUTPUT_LIMIT, DEFAULT_TIMEOUT_MS, type RunnerResultType } from "@/lib/runners/types";

/**
 * 教材モードの合否判定。
 *
 * 教材にはテストケースが付いていないので、次の2通りで判定する:
 * 1. 出力比較 … 用意したテスト入力(knockTests.ts)で提出コードと模範解答を走らせて比べる
 * 2. 性質チェック … 乱数など出力比較できない問題は、出力が満たすべき性質を直接検証する
 *
 * 1問につき複数のテスト入力を使う。1件だけだと「答えをベタ書きしたコード」も
 * 通ってしまうため、値の違う入力を複数流して初めて意味のある判定になる。
 */

/** どちらの方法でも判定できない問題(理由つき) */
const NON_JUDGEABLE: Record<number, string> = {
  39: "模範解答が何も出力しない問題のため、出力からは正誤を判断できません",
};

export type KnockCaseResult = {
  input: string;
  /** 出力比較のときの期待出力。性質チェックのときは null */
  expected: string | null;
  actual: string;
  passed: boolean;
  /** 失敗した理由(実行エラーや性質違反) */
  reason?: string;
};

export type KnockVerdict =
  | { kind: "AC"; passed: number; total: number }
  | { kind: "WA"; passed: number; total: number; firstFailure: KnockCaseResult }
  | { kind: "skipped"; reason: string }
  | { kind: "unavailable"; reason: string };

export function isJudgeable(no: number): boolean {
  return !(no in NON_JUDGEABLE);
}

/** その問題の判定方法を短く説明する(UIで学習者に見せる) */
export function describeJudgeMethod(no: number): string {
  if (no in NON_JUDGEABLE) return NON_JUDGEABLE[no];
  const check = KNOCK_PROPERTY_CHECKS[no];
  if (check) return `自動採点: ${check.description}`;
  const count = KNOCK_TEST_INPUTS[no]?.length ?? 0;
  return `自動採点: ${count}件のテスト入力で模範解答と出力を比べます`;
}

/** 模範解答の実行は学習者のコードより少し余裕を持たせる */
const REFERENCE_TIMEOUT_MS = 5000;

function describeRunFailure(type: RunnerResultType): string {
  switch (type) {
    case "compile-error":
      return "コンパイルできませんでした";
    case "runtime-error":
      return "実行中にエラーが起きました";
    case "timeout":
      return "時間内に終わりませんでした(無限ループの可能性)";
    case "output-limit":
      return "出力が多すぎます";
    case "success":
      return "";
  }
}

/**
 * 提出コードを全テストケースで実行して合否を返す。
 *
 * 提出コードを全ケース実行してから模範解答を全ケース実行する。
 * cRunnerはコンパイル結果を複数件キャッシュするので、コンパイルは各1回で済む。
 */
export async function judgeKnock(params: { problem: KnockProblem; code: string }): Promise<KnockVerdict> {
  const no = params.problem.no;
  const reason = NON_JUDGEABLE[no];
  if (reason) return { kind: "skipped", reason };

  const runner = getRunner("c");
  const check = KNOCK_PROPERTY_CHECKS[no];
  const inputs = check ? check.inputs : KNOCK_TEST_INPUTS[no];
  if (!inputs || inputs.length === 0) {
    return { kind: "unavailable", reason: "この問題のテスト入力が用意されていません" };
  }

  // --- 提出コードを全ケース実行 ---
  const userRuns: Array<{ input: string; type: RunnerResultType; stdout: string }> = [];
  for (const input of inputs) {
    const r = await runner.run({
      code: params.code,
      input,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      outputLimit: DEFAULT_OUTPUT_LIMIT,
    });
    userRuns.push({ input, type: r.type, stdout: r.stdout });
  }

  // --- 性質チェックの問題はここで判定できる ---
  if (check) {
    const results: KnockCaseResult[] = userRuns.map((run) => {
      if (run.type !== "success") {
        return { input: run.input, expected: null, actual: run.stdout, passed: false, reason: describeRunFailure(run.type) };
      }
      const violation = check.validate(run.stdout);
      return {
        input: run.input,
        expected: null,
        actual: run.stdout,
        passed: violation === null,
        reason: violation ?? undefined,
      };
    });
    return summarize(results);
  }

  // --- 出力比較: 模範解答を全ケース実行して期待出力を作る ---
  const results: KnockCaseResult[] = [];
  for (const run of userRuns) {
    const ref = await runner.run({
      code: params.problem.solution,
      input: run.input,
      timeoutMs: REFERENCE_TIMEOUT_MS,
      outputLimit: DEFAULT_OUTPUT_LIMIT,
    });
    if (ref.type !== "success") {
      return {
        kind: "unavailable",
        reason: "模範解答を実行できなかったため判定できませんでした。時間をおいて試してください",
      };
    }
    if (run.type !== "success") {
      results.push({
        input: run.input,
        expected: ref.stdout,
        actual: run.stdout,
        passed: false,
        reason: describeRunFailure(run.type),
      });
      continue;
    }
    results.push({
      input: run.input,
      expected: ref.stdout,
      actual: run.stdout,
      passed: compareOutput(run.stdout, ref.stdout),
    });
  }
  return summarize(results);
}

function summarize(results: KnockCaseResult[]): KnockVerdict {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  if (passed === total) return { kind: "AC", passed, total };
  return { kind: "WA", passed, total, firstFailure: results.find((r) => !r.passed)! };
}
