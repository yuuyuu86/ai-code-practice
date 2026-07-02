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
