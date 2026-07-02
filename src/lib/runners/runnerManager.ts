import type { Language } from "@/types/problem";
import type { LanguageRunner } from "./types";
import { javascriptRunner } from "./javascriptRunner";
import { pythonRunner } from "./pythonRunner";
import { cRunner } from "./cRunner";

/**
 * 言語 → Runner の対応表。
 * 新しい言語を追加するときは、Runnerを実装してここに1行足すだけでよい。
 */
const runners: Record<string, LanguageRunner> = {
  javascript: javascriptRunner,
  python: pythonRunner,
  c: cRunner,
};

export function getRunner(language: Language): LanguageRunner {
  const runner = runners[language];
  if (!runner) {
    throw new Error(`未対応の言語です: ${language}`);
  }
  return runner;
}

export function registerRunner(runner: LanguageRunner): void {
  runners[runner.language] = runner;
}
