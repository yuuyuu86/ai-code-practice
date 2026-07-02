export type JudgeStatus = "AC" | "WA" | "CE" | "RE" | "TLE" | "OLE";

export type FailedCase = {
  index: number;
  input: string;
  expected: string;
  actual: string;
  errorMessage?: string;
};

export type JudgeResult = {
  status: JudgeStatus;
  passedCount: number;
  totalCount: number;
  failedCase?: FailedCase;
  /** CE時のコンパイルエラーメッセージなど */
  message?: string;
  elapsedMs: number;
};
