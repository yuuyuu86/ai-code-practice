import type { GenerateProblemInput, Problem } from "@/types/problem";
import { chat, isWebGPUAvailable, type LoadProgress } from "./webllmClient";
import { buildDetailsPrompt, buildSpecPrompt, buildSolutionPrompt } from "./prompts";
import {
  parseProblemDetails,
  parseProblemOutline,
  extractCode,
  type ProblemOutline,
  type ProblemSpec,
} from "@/lib/problem/schema";
import { findForbiddenPattern, findNonJapaneseReason, validateProblemStructure } from "@/lib/problem/validateProblem";
import { buildTests } from "@/lib/problem/buildTests";
import { cacheAIProblem, findCachedProblem, saveGeneratedProblem } from "@/lib/storage/problems";

const MAX_ATTEMPTS = 5;
const MAX_OUTLINE_ATTEMPTS = 2;
const MAX_SOLUTION_ATTEMPTS = 2;

export type GenerateProgress =
  | { phase: "loading-model"; detail: LoadProgress }
  | { phase: "drafting-outline"; attempt: number }
  | { phase: "drafting-details"; attempt: number }
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
  const referenceProblem = await findCachedProblem(input.language, input.difficulty, input.topic);
  const referenceExample = referenceProblem ? formatReferenceProblem(referenceProblem) : undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // --- 第1段階: 問題の骨格を生成 ---
      let outline: ProblemOutline | null = null;
      let outlineFailureReason = failureReason;
      for (let outlineAttempt = 1; outlineAttempt <= MAX_OUTLINE_ATTEMPTS; outlineAttempt++) {
        onProgress?.({ phase: "drafting-outline", attempt });
        const outlinePrompt = buildSpecPrompt(input, outlineFailureReason, referenceExample);
        const outlineResponse = await chat(
          [
            { role: "system", content: outlinePrompt.system },
            { role: "user", content: outlinePrompt.user },
          ],
          {
            temperature: outlineAttempt === 1 ? 0.2 : 0.35,
            maxTokens: 768,
            onProgress: (detail) => onProgress?.({ phase: "loading-model", detail }),
          },
        );

        const parsedOutline = parseProblemOutline(outlineResponse);
        // 小型モデルは指示してもタイトルに"Advanced Level:"等のラベルを付けがちで、
        // 拒否してリトライさせるだけでは同じ失敗を繰り返し試行回数を無駄にする。
        // ここで自動的に取り除き、拒否は取り切れなかった場合の保険として残す。
        parsedOutline.title = sanitizeTitleLabel(parsedOutline.title);
        const outlineCheck = checkOutline(parsedOutline, input.difficulty);
        if (outlineCheck.ok) {
          outline = parsedOutline;
          break;
        }

        outlineFailureReason = compactFailureReason(decorateFailureReason(outlineCheck.reason, outlineResponse));
        console.warn(
          `[generateProblem] 試行${attempt}.${outlineAttempt} 骨格生成NG: ${outlineCheck.reason}\n生出力:\n`,
          outlineResponse,
        );
      }
      if (!outline) {
        failureReason = outlineFailureReason ?? "問題の骨格を生成できませんでした";
        continue;
      }

      // --- 第2段階: 骨格に対して詳細を補完 ---
      onProgress?.({ phase: "drafting-details", attempt });
      const detailsPrompt = buildDetailsPrompt(input, outline, failureReason, referenceExample);
      const detailsResponse = await chat(
        [
          { role: "system", content: detailsPrompt.system },
          { role: "user", content: detailsPrompt.user },
        ],
        { temperature: attempt === 1 ? 0.3 : 0.5, maxTokens: 1024 },
      );
      const details = parseProblemDetails(detailsResponse);
      const spec = mergeSpec(outline, details);
      const specCheck = checkSpec(spec, input.difficulty);
      if (!specCheck.ok) {
        failureReason = compactFailureReason(decorateFailureReason(specCheck.reason, detailsResponse));
        console.warn(`[generateProblem] 試行${attempt} 詳細生成NG: ${specCheck.reason}\n生出力:\n`, detailsResponse);
        continue;
      }

      // --- 第3段階: 上の問題を解くPython模範解答を生成 ---
      let python = "";
      let solved = false;
      let solutionFailureReason: string | undefined;
      for (let solutionAttempt = 1; solutionAttempt <= MAX_SOLUTION_ATTEMPTS; solutionAttempt++) {
        onProgress?.({ phase: "solving", attempt });
        const solPrompt = buildSolutionPrompt(spec, solutionFailureReason);
        const solResponse = await chat(
          [
            { role: "system", content: solPrompt.system },
            { role: "user", content: solPrompt.user },
          ],
          { temperature: solutionAttempt === 1 ? 0.15 : 0.3, maxTokens: 1024 },
        );
        python = extractCode(solResponse);
        if (!python || !looksLikePythonSolution(python)) {
          solutionFailureReason = "模範解答はPythonコードだけを出力し、標準入力を読み、print()で結果を出力してください";
          console.warn(`[generateProblem] 試行${attempt}.${solutionAttempt} 解答生成NG\n生出力:\n`, solResponse);
          continue;
        }
        solved = true;
        break;
      }
      if (!solved) {
        failureReason = compactFailureReason(solutionFailureReason ?? "模範解答のPythonコードが生成できませんでした");
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
        failureReason = compactFailureReason(validation.reason);
        console.warn(`[generateProblem] 試行${attempt} 構造検証NG: ${validation.reason}`, raw);
        continue;
      }

      onProgress?.({ phase: "building-tests", attempt });
      const testsResult = await buildTests(validation.problem);
      if (!testsResult.ok) {
        failureReason = compactFailureReason(testsResult.reason);
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

/**
 * タイトル先頭の英語ラベル/レベル表記("Advanced Level: " "Step 3 - " 等)を取り除く。
 * 区切り記号(: ： - —)の直前までを1個のラベルとみなし、複数付いていれば繰り返し剥がす。
 */
function sanitizeTitleLabel(title: string): string {
  const labelPrefix =
    /^(advanced|beginner|intermediate|expert|basic|easy|hard|medium|level|problem|question|task|step)\b[\s\p{L}\p{N}]{0,12}?[:：\-—]\s*/iu;
  let t = title.trim();
  for (let i = 0; i < 3; i++) {
    const next = t.replace(labelPrefix, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/** タイトルに "Advanced" "Level" などの英語ラベル/レベル表記が付いていないか */
function checkTitleLabel(title: string): { ok: true } | { ok: false; reason: string } {
  if (/\b(advanced|beginner|intermediate|expert|basic|easy|hard|medium|level|problem|question|task|step\s*\d)\b/i.test(title)) {
    return {
      ok: false,
      reason: "タイトルに「Advanced」「Level」などの英語ラベルやレベル表記を付けないでください。日本語の問題名だけにしてください",
    };
  }
  return { ok: true };
}

/** 難易度が入門以外なのに、単純な2数の和で終わる問題になっていないか */
function checkTrivialForDifficulty(
  difficulty: string,
  text: string,
): { ok: true } | { ok: false; reason: string } {
  if (difficulty === "入門") return { ok: true };
  const trivialSum =
    /(2\s*つの(整数|数)).{0,12}(和|合計)/.test(text) ||
    /\bA\b.{0,4}(と|、|,|＋|\+).{0,4}\bB\b.{0,12}(和|合計|足)/.test(text);
  if (trivialSum) {
    return {
      ok: false,
      reason: `難易度が「${difficulty}」なので、「2つの数の和」のような1回の足し算で終わる問題にはしないでください。複数の手順が必要な問題にしてください`,
    };
  }
  return { ok: true };
}

/** 第1段階の仕様が十分か軽くチェックする */
function checkSpec(spec: ProblemSpec, difficulty: string): { ok: true } | { ok: false; reason: string } {
  if (!spec.title.trim()) return { ok: false, reason: "タイトルが読み取れませんでした。[TITLE]見出しを使ってください" };
  if (!spec.statement.trim()) return { ok: false, reason: "問題文が読み取れませんでした。[STATEMENT]見出しを使ってください" };
  if (!spec.inputFormat.trim()) return { ok: false, reason: "入力形式が読み取れませんでした。[INPUT_FORMAT]見出しを使ってください" };
  if (!spec.outputFormat.trim()) return { ok: false, reason: "出力形式が読み取れませんでした。[OUTPUT_FORMAT]見出しを使ってください" };
  if (spec.inputs.length < 3) {
    return { ok: false, reason: `入力例が${spec.inputs.length}個しかありません。[INPUTS]に ==== 区切りで5個書いてください` };
  }
  const titleLabel = checkTitleLabel(spec.title);
  if (!titleLabel.ok) return titleLabel;
  const trivial = checkTrivialForDifficulty(difficulty, `${spec.title}\n${spec.statement}\n${spec.outputFormat}`);
  if (!trivial.ok) return trivial;
  const nonJapanese = findNonJapaneseReason(
    [spec.title, spec.statement, spec.inputFormat, spec.outputFormat, ...spec.constraints, ...spec.hints, spec.explanation].join(
      "\n",
    ),
  );
  if (nonJapanese) {
    return { ok: false, reason: `${nonJapanese}。問題文や解説は日本語で書いてください` };
  }
  // 禁止パターン(乱数・時刻など)は問題文の時点で分かるので、
  // 高価な模範解答生成に進む前にここで弾いてリトライに回す
  const forbidden = findForbiddenPattern(
    `${spec.title}\n${spec.statement}\n${spec.inputFormat}\n${spec.outputFormat}`,
  );
  if (forbidden) {
    return { ok: false, reason: `${forbidden}を含む問題は作れません。標準入出力だけで解ける問題にしてください` };
  }
  return { ok: true };
}

function checkOutline(outline: ProblemOutline, difficulty: string): { ok: true } | { ok: false; reason: string } {
  if (!outline.title.trim()) return { ok: false, reason: "タイトルが読み取れませんでした。[TITLE]見出しを使ってください" };
  if (!outline.statement.trim()) return { ok: false, reason: "問題文が読み取れませんでした。[STATEMENT]見出しを使ってください" };
  if (!outline.inputFormat.trim()) return { ok: false, reason: "入力形式が読み取れませんでした。[INPUT_FORMAT]見出しを使ってください" };
  if (!outline.outputFormat.trim()) return { ok: false, reason: "出力形式が読み取れませんでした。[OUTPUT_FORMAT]見出しを使ってください" };
  const titleLabel = checkTitleLabel(outline.title);
  if (!titleLabel.ok) return titleLabel;
  const trivial = checkTrivialForDifficulty(difficulty, `${outline.title}\n${outline.statement}\n${outline.outputFormat}`);
  if (!trivial.ok) return trivial;
  const nonJapanese = findNonJapaneseReason(
    [outline.title, outline.statement, outline.inputFormat, outline.outputFormat].join("\n"),
  );
  if (nonJapanese) {
    return { ok: false, reason: `${nonJapanese}。問題文や入出力形式は日本語で書いてください` };
  }
  return { ok: true };
}

function mergeSpec(
  outline: ProblemOutline,
  details: ReturnType<typeof parseProblemDetails>,
): ProblemSpec {
  return {
    title: outline.title,
    statement: outline.statement,
    inputFormat: outline.inputFormat,
    outputFormat: outline.outputFormat,
    constraints: details.constraints.length > 0 ? details.constraints : buildFallbackConstraints(outline, details.inputs),
    inputs: details.inputs,
    hints: details.hints.length > 0 ? details.hints : buildFallbackHints(outline),
    explanation: details.explanation.trim() || buildFallbackExplanation(outline),
  };
}

function decorateFailureReason(reason: string, rawText: string): string {
  const snippet = rawText.trim().slice(0, 160).replace(/\n/g, "⏎");
  return `${reason}(モデルの出力先頭: 「${snippet}」)`;
}

function compactFailureReason(reason: string): string {
  return reason.replace(/\(モデルの出力先頭: 「[\s\S]*?」\)/g, "").replace(/\s+/g, " ").trim();
}

function buildFallbackConstraints(outline: ProblemOutline, inputs: string[]): string[] {
  const constraints = ["入力される値はすべて int の範囲に収まる。"];
  if (/\b1行\b/.test(outline.inputFormat)) {
    constraints.push("入力は問題文で説明された形式の1件だけが標準入力から与えられる。");
  } else {
    constraints.push("入力は問題文で説明された形式に従って標準入力から与えられる。");
  }
  if (inputs.length > 0) {
    constraints.push("例として示された入力以外でも、同じ形式の値が与えられる。");
  }
  return constraints;
}

function buildFallbackHints(outline: ProblemOutline): string[] {
  return [
    "まず入力を問題文どおりに読み取ります。",
    "必要な計算や判定の手順を順番に整理します。",
    `${outline.outputFormat || "求めた結果"}を最後に出力します。`,
  ];
}

function buildFallbackExplanation(outline: ProblemOutline): string {
  return `${outline.statement || "問題文"}に従って入力を読み取り、必要な処理を行ってから結果を出力する問題です。`;
}

function looksLikePythonSolution(code: string): boolean {
  return /print\s*\(/.test(code) && /(input\s*\(|sys\.stdin|map\s*\(|int\s*\()/.test(code);
}

function formatReferenceProblem(problem: Problem): string {
  return `[TITLE]
${problem.title}
[STATEMENT]
${problem.statement}
[INPUT_FORMAT]
${problem.inputFormat}
[OUTPUT_FORMAT]
${problem.outputFormat}
[CONSTRAINTS]
${problem.constraints.map((line) => `- ${line}`).join("\n")}
[SAMPLE_INPUT]
${problem.samples[0]?.input ?? ""}
[SAMPLE_OUTPUT]
${problem.samples[0]?.output ?? ""}
[END]`;
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
