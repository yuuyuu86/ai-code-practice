import type { Review } from "@/types/submission";
import type { RunnerResultType } from "@/lib/runners/types";
import type { KnockProblem } from "@/data/knock100";
import { chat, isWebGPUAvailable, type LoadProgress } from "./webllmClient";
import { buildKnockReviewPrompt, parseDelimitedReview } from "./prompts";
import { isCodeEffectivelyEmpty, stripCodeBlocks } from "./generateReview";

/** 実行結果から機械的に作る「結果」欄の文言。AIには書かせない。 */
const RUN_RESULT_LABELS: Record<RunnerResultType, string> = {
  success: "実行できました(合否の自動判定はしていません)",
  "compile-error": "コンパイルエラー(プログラムを作れませんでした)",
  "runtime-error": "実行時エラー(途中で止まりました)",
  timeout: "時間切れ(2秒以内に終わりませんでした)",
  "output-limit": "出力が多すぎます(10,000文字を超えました)",
};

/** AIが使えない/失敗したときに必ず返せる固定文レビュー */
function buildMachineKnockReview(runType: RunnerResultType): Review {
  const templates: Record<RunnerResultType, Omit<Review, "result" | "aiGenerated">> = {
    success: {
      cause: "プログラムは最後まで実行できました。出力が問題文の指示どおりか、自分の目で確かめてみましょう。",
      direction: "問題文をもう一度読み、求められている表示の内容や順番と、実際の出力を見比べてみましょう。",
      nextStep: "入力する値をいくつか変えて実行し、どんな値でも正しく動くか試してみましょう。",
    },
    "compile-error": {
      cause: "コードの書き方に文法上の問題があり、コンパイルの段階で止まりました。",
      direction: "エラーメッセージに出ている行の周辺を見て、セミコロンや括弧、スペルを確認しましょう。",
      nextStep: "エラーメッセージの最初の1行だけをまず読んで、その行を直してみましょう。",
    },
    "runtime-error": {
      cause: "実行の途中でエラーが起きて止まりました。",
      direction: "入力の読み方(書式や個数)と、配列の範囲外アクセスがないかを確認しましょう。",
      nextStep: "入力を読む部分だけを残して、まず入力が正しく読めているか表示して確かめましょう。",
    },
    timeout: {
      cause: "プログラムが制限時間(2秒)内に終わりませんでした。",
      direction: "ループの終了条件が正しいか、無限ループになっていないかを確認しましょう。",
      nextStep: "ループの中でカウンタが確実に進んでいるか、1行ずつ確認してみましょう。",
    },
    "output-limit": {
      cause: "出力が上限(10,000文字)を超えました。出力しすぎている可能性があります。",
      direction: "ループの中で printf を何回呼んでいるかを確認しましょう。",
      nextStep: "出力する回数を数えて、問題が求めている回数と比べてみましょう。",
    },
  };

  return {
    result: RUN_RESULT_LABELS[runType],
    ...templates[runType],
    aiGenerated: false,
  };
}

/** コードがまだ書かれていないときの案内(AIには投げない) */
function buildEmptyCodeKnockReview(runType: RunnerResultType): Review {
  return {
    result: RUN_RESULT_LABELS[runType],
    cause: "まだコードが書かれていないようです。エディタには最初のコメントしかありません。",
    direction: "問題文を読んで、まずは表示や入力を行う1行から書き始めてみましょう。",
    nextStep: "printf で何か1行表示するところから始めて、もう一度実行してみましょう。",
    aiGenerated: false,
  };
}

/**
 * 教材モード(100本ノック)のレビュー生成。
 * この教材には自動採点用のテストケースが無いため合否判定は行わず、
 * AIが問題文・コード・実行結果を見て講評する。
 * AIが使えない場合は実行結果だけから作る機械レビューにフォールバックする。
 */
export async function generateKnockReview(params: {
  problem: KnockProblem;
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  runType: RunnerResultType;
  onProgress?: (p: LoadProgress) => void;
}): Promise<Review> {
  const machine = buildMachineKnockReview(params.runType);

  // 空コードにコードの中身を語らせると存在しない処理を捏造するため、AIに投げない
  if (isCodeEffectivelyEmpty(params.code, "c")) {
    return buildEmptyCodeKnockReview(params.runType);
  }

  if (!isWebGPUAvailable()) {
    return machine;
  }

  try {
    const { system, user } = buildKnockReviewPrompt({
      knockNo: params.problem.no,
      title: params.problem.title,
      statement: params.problem.statement,
      code: params.code,
      stdin: params.stdin,
      stdout: params.stdout,
      stderr: params.stderr,
      runType: params.runType,
    });
    const response = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.4, maxTokens: 512, onProgress: params.onProgress },
    );
    const parsed = parseDelimitedReview(response);
    if (parsed && (parsed.cause || parsed.direction || parsed.nextStep)) {
      return {
        // 結果欄は実行結果から機械的に作る(AIに事実を変えさせない)
        result: RUN_RESULT_LABELS[params.runType],
        cause: stripCodeBlocks(parsed.cause) || machine.cause,
        direction: stripCodeBlocks(parsed.direction) || machine.direction,
        nextStep: stripCodeBlocks(parsed.nextStep) || machine.nextStep,
        aiGenerated: true,
      };
    }
    console.warn("[generateKnockReview] AIレビューをパースできませんでした。機械レビューを使用。生出力:\n", response);
    return machine;
  } catch (err) {
    console.warn("[generateKnockReview] AIレビュー生成に失敗(機械レビューを使用):", err);
    return machine;
  }
}
