import type { GenerateProblemInput, Problem } from "@/types/problem";
import { chat, isWebGPUAvailable, type LoadProgress } from "./webllmClient";
import { buildSpecPrompt, buildSolutionPrompt } from "./prompts";
import { parseProblemSpec, extractCode, type ProblemSpec } from "@/lib/problem/schema";
import { validateProblemStructure } from "@/lib/problem/validateProblem";
import { buildTests } from "@/lib/problem/buildTests";
import { cacheAIProblem, findCachedProblem, saveGeneratedProblem } from "@/lib/storage/problems";

const MAX_ATTEMPTS = 3;

export type GenerateProgress =
  | { phase: "loading-model"; detail: LoadProgress }
  | { phase: "generating"; attempt: number }
  | { phase: "solving"; attempt: number }
  | { phase: "validating"; attempt: number }
  | { phase: "building-tests"; attempt: number };

export type GenerateResult =
  | { ok: true; problem: Problem; fromCache: boolean }
  | { ok: false; error: "generation-failed" | "ai-unavailable"; message: string };

/**
 * WebLLMで問題を生成し、Validator + expected生成(Pyodide)を通す。
 * - 検証失敗時は失敗理由をプロンプトに渡して最大3回まで再生成
 * - WebLLMが使えない場合はIndexedDBのキャッシュ済みAI問題にフォールバック
 * - テンプレ問題生成は行わない
 */
export async function generateProblem(
  input: GenerateProblemInput,
  onProgress?: (p: GenerateProgress) => void,
): Promise<GenerateResult> {
  if (!isWebGPUAvailable()) {
    return fallbackToCache(input, "このブラウザではWebGPUが使えないため、AI問題生成を利用できません。");
  }

  let failureReason: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // --- 第1段階: 問題仕様(コードなし)を生成 ---
      onProgress?.({ phase: "generating", attempt });
      const specPrompt = buildSpecPrompt(input, failureReason);
      const specResponse = await chat(
        [
          { role: "system", content: specPrompt.system },
          { role: "user", content: specPrompt.user },
        ],
        {
          temperature: attempt === 1 ? 0.4 : 0.7,
          maxTokens: 1536,
          // 注: response_format:json_object はこのモデル/バージョンで
          // 「Cannot pass non-string to std::string」で落ちるため使わない。
          onProgress: (detail) => onProgress?.({ phase: "loading-model", detail }),
        },
      );

      const spec = parseProblemSpec(specResponse);
      const specCheck = checkSpec(spec);
      if (!specCheck.ok) {
        failureReason = specCheck.reason;
        const snippet = specResponse.trim().slice(0, 160).replace(/\n/g, "⏎");
        console.warn(`[generateProblem] 試行${attempt} 仕様生成NG: ${specCheck.reason}\n生出力:\n`, specResponse);
        failureReason += `(モデルの出力先頭: 「${snippet}」)`;
        continue;
      }

      // --- 第2段階: 上の問題を解くPython模範解答を生成 ---
      onProgress?.({ phase: "solving", attempt });
      const solPrompt = buildSolutionPrompt(spec);
      const solResponse = await chat(
        [
          { role: "system", content: solPrompt.system },
          { role: "user", content: solPrompt.user },
        ],
        { temperature: 0.2, maxTokens: 1024 },
      );
      const python = extractCode(solResponse);
      if (!python || !/print\s*\(/.test(python)) {
        failureReason = "模範解答のPythonコードが生成できませんでした";
        console.warn(`[generateProblem] 試行${attempt} 解答生成NG\n生出力:\n`, solResponse);
        continue;
      }

      // --- 構造検証 + Pyodideでexpected生成 ---
      onProgress?.({ phase: "validating", attempt });
      const raw = {
        title: spec.title,
        statement: spec.statement,
        inputFormat: spec.inputFormat,
        outputFormat: spec.outputFormat,
        constraints: spec.constraints,
        samples: [{ input: spec.inputs[0], output: "" }],
        testInputs: spec.inputs,
        referenceSolutions: { python },
        hints: spec.hints,
        explanation: spec.explanation,
      };
      const validation = validateProblemStructure(raw);
      if (!validation.ok) {
        failureReason = validation.reason;
        console.warn(`[generateProblem] 試行${attempt} 構造検証NG: ${validation.reason}`, raw);
        continue;
      }

      onProgress?.({ phase: "building-tests", attempt });
      const testsResult = await buildTests(validation.problem);
      if (!testsResult.ok) {
        failureReason = testsResult.reason;
        console.warn(`[generateProblem] 試行${attempt}/${MAX_ATTEMPTS} 失敗(テスト生成): ${testsResult.reason}`);
        continue;
      }

      const problem: Problem = {
        id: crypto.randomUUID(),
        title: validation.problem.title,
        difficulty: input.difficulty,
        topic: input.topic,
        supportedLanguages: ["c", "python", "javascript"],
        statement: validation.problem.statement,
        inputFormat: validation.problem.inputFormat,
        outputFormat: validation.problem.outputFormat,
        constraints: validation.problem.constraints,
        samples: validation.problem.samples,
        testInputs: validation.problem.testInputs,
        tests: testsResult.tests,
        referenceSolutions: validation.problem.referenceSolutions,
        hints: validation.problem.hints,
        explanation: validation.problem.explanation,
        createdAt: new Date().toISOString(),
      };

      await saveGeneratedProblem(problem);
      await cacheAIProblem(problem, input.language); // 検証済み問題をフォールバック用にキャッシュ
      return { ok: true, problem, fromCache: false };
    } catch (err) {
      // モデル読み込み自体の失敗 → キャッシュへフォールバック
      console.warn("[generateProblem] 生成エラー:", err);
      if (attempt === MAX_ATTEMPTS || isModelLoadError(err)) {
        return fallbackToCache(input, "AIモデルの読み込みに失敗しました。");
      }
      failureReason = "生成中にエラーが発生しました";
    }
  }

  return {
    ok: false,
    error: "generation-failed",
    message:
      "問題生成に失敗しました。条件を変えてもう一度試してください。" +
      (failureReason ? `\n\n(最後の失敗理由: ${failureReason})` : ""),
  };
}

/** 第1段階の仕様が十分か軽くチェックする */
function checkSpec(spec: ProblemSpec): { ok: true } | { ok: false; reason: string } {
  if (!spec.title.trim()) return { ok: false, reason: "タイトルが読み取れませんでした。[TITLE]見出しを使ってください" };
  if (!spec.statement.trim()) return { ok: false, reason: "問題文が読み取れませんでした。[STATEMENT]見出しを使ってください" };
  if (!spec.inputFormat.trim()) return { ok: false, reason: "入力形式が読み取れませんでした。[INPUT_FORMAT]見出しを使ってください" };
  if (!spec.outputFormat.trim()) return { ok: false, reason: "出力形式が読み取れませんでした。[OUTPUT_FORMAT]見出しを使ってください" };
  if (spec.inputs.length < 4) {
    return { ok: false, reason: `入力例が${spec.inputs.length}個しかありません。[INPUTS]に ==== 区切りで5個書いてください` };
  }
  return { ok: true };
}

function isModelLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /WebGPU|GPU|shader|device|fetch|network|download/i.test(msg);
}

async function fallbackToCache(
  input: GenerateProblemInput,
  reasonPrefix: string,
): Promise<GenerateResult> {
  const cached = await findCachedProblem(input.language, input.difficulty, input.topic);
  if (cached) {
    return { ok: true, problem: cached, fromCache: true };
  }
  return {
    ok: false,
    error: "ai-unavailable",
    message: `${reasonPrefix}\nこの端末ではAI問題生成をまだ利用できません。\n過去に生成された問題がある場合は、その問題で練習できます。\nAIモデルの準備ができる端末で、まず問題を生成してください。`,
  };
}
