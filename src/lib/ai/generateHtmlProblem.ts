import type { GenerateProblemInput, Problem } from "@/types/problem";
import { chat } from "./webllmClient";
import { buildHtmlProblemPrompt } from "./htmlPrompts";
import { parseSections } from "@/lib/problem/schema";
import { checkHtmlCheckList, parseHtmlChecks } from "@/lib/problem/htmlChecks";
import { buildHtmlTests } from "@/lib/problem/buildHtmlTests";
import { findForbiddenPattern, findNonJapaneseReason } from "@/lib/problem/validateProblem";
import { cacheAIProblem, saveGeneratedProblem } from "@/lib/storage/problems";
import type { GenerateProgress } from "./generateProblem";

const MAX_ATTEMPTS = 5;

export type HtmlGenerateOutcome = { ok: true; problem: Problem } | { ok: false; failureReason: string };

/**
 * HTML+CSS+JS問題を生成する。
 *
 * 「出力」が無いので、期待する出力の代わりにDOMの調べ方(CHECKS)を作らせ、
 * それを模範解答のHTMLに対して実際に流して検証する。
 * ここでも期待値をAIに自己申告させない方針は変えていない。
 */
export async function generateHtmlProblem(
  input: GenerateProblemInput,
  onProgress?: (p: GenerateProgress) => void,
): Promise<HtmlGenerateOutcome> {
  let failureReason: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onProgress?.({ phase: "drafting-details", attempt });
    const prompt = buildHtmlProblemPrompt(input, failureReason);
    const response = await chat(
      [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      {
        temperature: attempt === 1 ? 0.3 : 0.5,
        maxTokens: 1400,
        onProgress: (detail) => onProgress?.({ phase: "loading-model", detail }),
      },
    );

    onProgress?.({ phase: "validating", attempt });
    const sections = parseSections(response);
    const title = (sections.TITLE ?? "").trim();
    const statement = (sections.STATEMENT ?? "").trim();
    const referenceHtml = stripCodeFence(sections.HTML ?? "");
    const checks = parseHtmlChecks(sections.CHECKS);
    const hints = (sections.HINTS ?? "")
      .split("\n")
      .map((l) => l.replace(/^\s*[-*・\d.]+\s*/, "").trim())
      .filter((l) => l !== "");
    const explanation = (sections.EXPLANATION ?? "").trim();

    if (title.length < 2 || statement.length < 15) {
      failureReason = "タイトルと問題文を日本語で書いてください";
      console.warn(`[generateHtmlProblem] 試行${attempt} 見出し不足\n生出力:\n`, response);
      continue;
    }
    if (!/<\s*(html|body|h1|div|p|ul)\b/i.test(referenceHtml)) {
      failureReason = "[HTML]に完成したHTMLを書いてください";
      console.warn(`[generateHtmlProblem] 試行${attempt} HTML不足\n生出力:\n`, response);
      continue;
    }
    const checkList = checkHtmlCheckList(checks);
    if (!checkList.ok) {
      failureReason = checkList.reason;
      console.warn(`[generateHtmlProblem] 試行${attempt} CHECKS検証NG: ${checkList.reason}\n生出力:\n`, response);
      continue;
    }

    const japanese = findNonJapaneseReason(`${title}\n${statement}\n${explanation}`);
    if (japanese) {
      failureReason = japanese;
      console.warn(`[generateHtmlProblem] 試行${attempt} 日本語チェックNG: ${japanese}`);
      continue;
    }
    const forbidden = findForbiddenPattern(`${title}\n${statement}`);
    if (forbidden) {
      failureReason = forbidden;
      continue;
    }
    if (hints.length === 0 || explanation.length < 10) {
      failureReason = "[HINTS]と[EXPLANATION]を書いてください";
      continue;
    }

    onProgress?.({ phase: "building-tests", attempt });
    const tests = await buildHtmlTests(checks, referenceHtml);
    if (!tests.ok) {
      failureReason = tests.reason;
      console.warn(`[generateHtmlProblem] 試行${attempt} テスト生成NG: ${tests.reason}`);
      continue;
    }

    const problem: Problem = {
      id: crypto.randomUUID(),
      title,
      difficulty: input.difficulty,
      topic: input.topic,
      supportedLanguages: ["html"],
      statement,
      inputFormat: "1つのHTMLファイルに、CSSは<style>、JavaScriptは<script>で書きます。",
      outputFormat: "表示されたページを次の項目で確かめます。",
      constraints: checks.map((c) => c.description),
      samples: [],
      testInputs: tests.tests.map((t) => t.input),
      tests: tests.tests,
      referenceSolutions: { python: "", html: referenceHtml },
      hints,
      explanation,
      createdAt: new Date().toISOString(),
    };

    await saveGeneratedProblem(problem);
    await cacheAIProblem(problem, "html");
    return { ok: true, problem };
  }

  return { ok: false, failureReason: failureReason ?? "HTML問題を生成できませんでした" };
}

function stripCodeFence(raw: string): string {
  return raw
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}
