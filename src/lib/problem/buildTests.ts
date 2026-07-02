import { pythonRunner } from "@/lib/runners/pythonRunner";
import { DEFAULT_OUTPUT_LIMIT } from "@/lib/runners/types";
import { compareOutput } from "@/lib/judge/compareOutput";
import type { RawGeneratedProblem } from "./schema";

export type BuildTestsResult =
  | { ok: true; tests: Array<{ input: string; expected: string }> }
  | { ok: false; reason: string };

/**
 * expected生成。
 * AIが書いたexpectedは信用せず、referenceSolutions.pythonをPyodideで実行して
 * 各testInputに対する期待出力を作る。
 * あわせて以下を検証する:
 * - referenceSolutions.pythonが全テスト入力で正常に実行できるか
 * - samplesのoutputと模範解答の出力が一致するか(=問題文と解答の整合性)
 */
export async function buildTests(raw: RawGeneratedProblem): Promise<BuildTestsResult> {
  const tests: Array<{ input: string; expected: string }> = [];

  for (const input of raw.testInputs) {
    const result = await pythonRunner.run({
      code: raw.referenceSolutions.python,
      input,
      timeoutMs: 5000, // 模範解答の実行はユーザー提出より緩めにする
      outputLimit: DEFAULT_OUTPUT_LIMIT,
    });

    if (result.type !== "success") {
      return {
        ok: false,
        reason: `referenceSolutions.pythonが入力「${truncate(input)}」で実行に失敗しました(${result.type}): ${truncate(result.stderr)}。模範解答は必ず動くコードにしてください`,
      };
    }
    if (result.stdout.trim() === "") {
      return {
        ok: false,
        reason: `referenceSolutions.pythonが入力「${truncate(input)}」で何も出力しませんでした。print()で出力してください`,
      };
    }
    tests.push({ input, expected: result.stdout });
  }

  // samplesの出力チェック。
  // - モデルがサンプル出力を書いている場合のみ、模範解答の出力と一致するか検証する
  //   (問題文と模範解答の食い違いを検出するため)。
  // - サンプル出力が空(2段階生成では出力を作らせない)の場合は、模範解答の出力で埋める。
  for (const sample of raw.samples) {
    const matching = tests.find((t) => t.input === sample.input);
    if (!matching) continue;
    if (sample.output.trim() === "") {
      sample.output = matching.expected;
    } else if (!compareOutput(matching.expected, sample.output)) {
      return {
        ok: false,
        reason: `サンプル入力「${truncate(sample.input)}」に対するサンプル出力「${truncate(sample.output)}」が、模範解答の実際の出力「${truncate(matching.expected)}」と一致しません。問題文と模範解答を整合させてください`,
      };
    }
  }

  return { ok: true, tests };
}

function truncate(text: string, max = 80): string {
  const t = text.replace(/\n/g, "\\n");
  return t.length > max ? t.slice(0, max) + "…" : t;
}
