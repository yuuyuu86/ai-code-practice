import type { JudgeResult, JudgeStatus } from "@/types/judge";
import type { Problem, Language } from "@/types/problem";
import type { Review } from "@/types/submission";
import { chat, isWebGPUAvailable } from "./webllmClient";
import { buildReviewPrompt, parseDelimitedReview } from "./prompts";
import { STATUS_DESCRIPTIONS } from "@/lib/judge/status";

/** 行コメント・ブロックコメント・空白を除いて、コードに実質的な中身があるか判定する */
function isCodeEffectivelyEmpty(code: string, language: Language): boolean {
  let stripped = code.replace(/\/\*[\s\S]*?\*\//g, ""); // C/JSのブロックコメント
  const lineComment = language === "python" ? "#" : "//";
  stripped = stripped
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(lineComment);
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("");
  return stripped.trim() === "";
}

/**
 * レビュー生成(2層)。
 * 1層目: 機械レビュー(判定結果から必ず作れる。AI不要)
 * 2層目: AIレビュー(WebLLMが使えるときだけ。判定は変えない)
 */
export async function generateReview(params: {
  problem: Problem;
  language: Language;
  code: string;
  judgeResult: JudgeResult;
}): Promise<Review> {
  const machine = buildMachineReview(params.judgeResult);

  // コードが空(テンプレやコメントだけ)なら、AIに投げず捏造を防ぐ。
  // 空コードにコードの中身を語らせると、存在しない処理をでっち上げるため。
  if (isCodeEffectivelyEmpty(params.code, params.language)) {
    return buildEmptyCodeReview(params.judgeResult.status);
  }

  if (!isWebGPUAvailable()) {
    return machine;
  }

  try {
    const { system, user } = buildReviewPrompt({
      problemTitle: params.problem.title,
      statement: params.problem.statement,
      language: params.language,
      code: params.code,
      judgeResult: params.judgeResult,
    });
    const response = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.4, maxTokens: 512 },
    );
    const parsed = parseDelimitedReview(response);
    if (parsed && (parsed.cause || parsed.direction || parsed.nextStep)) {
      // 部分的に取れたAI文を優先し、欠けた項目だけ機械レビューで補う。
      // モデルが指示に反して答えのコードを書いた場合に備え、コードブロックは除去する。
      return {
        // 結果は必ずJudge Engineの判定を使う(AIには変えさせない)
        result: `${params.judgeResult.status}(${STATUS_DESCRIPTIONS[params.judgeResult.status]})`,
        cause: stripCodeBlocks(parsed.cause) || machine.cause,
        direction: stripCodeBlocks(parsed.direction) || machine.direction,
        nextStep: stripCodeBlocks(parsed.nextStep) || machine.nextStep,
        aiGenerated: true,
      };
    }
    console.warn("[generateReview] AIレビューをパースできませんでした。機械レビューを使用。生出力:\n", response);
    return machine;
  } catch (err) {
    console.warn("[generateReview] AIレビュー生成に失敗(機械レビューを使用):", err);
    return machine;
  }
}

/** 機械レビュー: 判定結果だけから作る固定文レビュー */
function buildMachineReview(judgeResult: JudgeResult): Review {
  const { status } = judgeResult;
  const templates: Record<string, Omit<Review, "result" | "aiGenerated">> = {
    AC: {
      cause: "すべてのテストケースに合格しました。正しく実装できています。",
      direction: "コードを読み返して、変数名や書き方をさらに良くできないか考えてみましょう。",
      nextStep: "少し難しい難易度や、別の単元にも挑戦してみましょう。",
    },
    WA: {
      cause: "入力は読めていますが、出力している値が期待値と違います。",
      direction: "失敗したテストケースの入力と期待する出力を見比べて、計算や条件を確認しましょう。",
      nextStep: "失敗した入力を手で計算して、どこで結果がずれるか追いかけてみましょう。",
    },
    CE: {
      cause: "コードの書き方に文法上の問題があり、実行前のチェックで止まりました。",
      direction: "エラーメッセージに出ている行の周辺を見て、括弧やセミコロン、スペルを確認しましょう。",
      nextStep: "エラーメッセージの最初の1行だけをまず読んで、その行を直してみましょう。",
    },
    RE: {
      cause: "実行の途中でエラーが起きて止まりました。",
      direction: "入力の読み方(型や個数)と、配列の範囲外アクセスがないかを確認しましょう。",
      nextStep: "入力を読む部分だけを残して、まず入力が正しく読めているか出力して確かめましょう。",
    },
    TLE: {
      cause: "プログラムが制限時間(2秒)内に終わりませんでした。",
      direction: "ループの終了条件が正しいか、無限ループになっていないかを確認しましょう。",
      nextStep: "ループの中でカウンタが確実に進んでいるか、1行ずつ確認してみましょう。",
    },
    OLE: {
      cause: "出力が上限(10,000文字)を超えました。出力しすぎている可能性があります。",
      direction: "ループの中でprint(出力)を何回呼んでいるかを確認しましょう。",
      nextStep: "出力する回数を数えて、問題が求めている回数と比べてみましょう。",
    },
  };

  const t = templates[status];
  return {
    result: `${status}(${STATUS_DESCRIPTIONS[status]})`,
    ...t,
    aiGenerated: false,
  };
}

/**
 * レビュー文からコードブロックを取り除く。
 * 学習目的で答えのコードは見せない方針。```で囲まれた部分と、
 * それに続く連続したコード行(=で代入している等)をまとめて除去する。
 */
function stripCodeBlocks(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "") // 閉じたコードフェンス
    .replace(/```[\s\S]*$/g, "") // 閉じ忘れフェンス以降
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** コードがまだ書かれていないときの案内レビュー(AIには投げない) */
function buildEmptyCodeReview(status: JudgeStatus): Review {
  return {
    result: `${status}(${STATUS_DESCRIPTIONS[status]})`,
    cause: "まだコードが書かれていないようです。エディタには最初のコメントしかありません。",
    direction: "問題文の入力形式と出力形式を読んで、まずは入力を受け取る1行から書き始めてみましょう。",
    nextStep: "コメントの下に、入力を読む処理と結果を出力する処理を1行ずつ書いて、もう一度実行してみましょう。",
    aiGenerated: false,
  };
}
