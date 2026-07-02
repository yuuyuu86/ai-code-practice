import type { Language } from "@/types/problem";

export type RunnerResultType = "success" | "compile-error" | "runtime-error" | "timeout" | "output-limit";

export type RunnerResult = {
  type: RunnerResultType;
  stdout: string;
  stderr: string;
  elapsedMs: number;
};

export type RunParams = {
  code: string;
  input: string;
  timeoutMs: number;
  /** stdout上限(文字数)。超えたら output-limit */
  outputLimit: number;
};

/**
 * 言語ごとのRunnerインターフェース。
 * 新しい言語を追加するときは、この型を実装してrunnerManagerに登録するだけでよい。
 */
export type LanguageRunner = {
  language: Language | string;
  /** 実行環境がこの端末で利用可能か(重い初期化はしない) */
  isAvailable: () => Promise<boolean>;
  run: (params: RunParams) => Promise<RunnerResult>;
  /** 事前ウォームアップ(任意) */
  warmup?: () => Promise<void>;
};

export const DEFAULT_TIMEOUT_MS = 2000;
export const DEFAULT_OUTPUT_LIMIT = 10_000;
export const MAX_INPUT_BYTES = 10 * 1024;
