import type { RunnerResultType } from "@/lib/runners/types";
import type { JudgeResult, JudgeStatus } from "./judge";
import type { Language } from "./problem";

export type Submission = {
  id: string;
  problemId: string;
  problemTitle: string;
  language: Language;
  code: string;
  status: JudgeStatus;
  judgeResult: JudgeResult;
  review?: Review;
  createdAt: string;
};

/**
 * 教材モード(100本ノック)の提出履歴。
 * 合否判定を行わないため JudgeStatus/JudgeResult は持たず、
 * 実際に流した標準入力と、実行結果の生の出力を保持する。
 */
export type KnockSubmission = {
  id: string;
  knockNo: number;
  knockTitle: string;
  /** 教材はC言語のみ */
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  runType: RunnerResultType;
  review?: Review;
  createdAt: string;
};

export type Review = {
  result: string;
  cause: string;
  direction: string;
  nextStep: string;
  /** AIレビューが生成できたか(falseなら機械レビューのみ) */
  aiGenerated: boolean;
};

export type ProblemProgress = {
  problemId: string;
  status: "not_started" | "trying" | "solved" | "review";
  attempts: number;
  lastStatus?: JudgeStatus;
  lastTriedAt?: string;
  solvedAt?: string;
};
