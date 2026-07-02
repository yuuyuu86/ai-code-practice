import type { RawGeneratedProblem } from "./schema";

export type ValidationResult =
  | { ok: true; problem: RawGeneratedProblem }
  | { ok: false; reason: string };

/** 問題文が要求してはいけない操作(C向けの環境依存・危険処理も含む) */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ファイル(を|に|の)(読|書|開|保存|作成)/, label: "ファイル操作" },
  { pattern: /fopen|fwrite|fread|open\s*\(.*["']w["']/, label: "ファイル操作" },
  { pattern: /ネットワーク|http:\/\/|https:\/\/|socket|fetch\s*\(/i, label: "ネットワーク操作" },
  { pattern: /system\s*\(/, label: "system関数" },
  { pattern: /乱数|ランダム|random|rand\s*\(/i, label: "乱数(出力が一意に決まらない)" },
  { pattern: /現在(時刻|日時)|time\s*\(\s*NULL/i, label: "現在時刻(出力が一意に決まらない)" },
];

/**
 * Problem Validator(構造チェック)。
 * referenceSolutions.pythonの実行チェックとsamples照合はbuildTests側で行う。
 */
export function validateProblemStructure(data: unknown): ValidationResult {
  if (typeof data !== "object" || data === null) {
    return { ok: false, reason: "JSONがオブジェクトではありません" };
  }
  const p = data as Partial<RawGeneratedProblem>;

  if (typeof p.title !== "string" || p.title.trim() === "") {
    return { ok: false, reason: "titleがありません" };
  }
  if (typeof p.statement !== "string" || p.statement.trim() === "") {
    return { ok: false, reason: "statementが空です" };
  }
  if (typeof p.inputFormat !== "string" || p.inputFormat.trim() === "") {
    return { ok: false, reason: "inputFormatがありません" };
  }
  if (typeof p.outputFormat !== "string" || p.outputFormat.trim() === "") {
    return { ok: false, reason: "outputFormatがありません" };
  }
  if (!Array.isArray(p.constraints) || p.constraints.length === 0) {
    return { ok: false, reason: "constraintsがありません" };
  }
  if (!Array.isArray(p.samples) || p.samples.length === 0) {
    return { ok: false, reason: "samplesがありません" };
  }
  for (const s of p.samples) {
    if (typeof s?.input !== "string" || typeof s?.output !== "string") {
      return { ok: false, reason: "samplesの形式が不正です(inputとoutputの文字列が必要)" };
    }
  }
  if (!Array.isArray(p.testInputs)) {
    return { ok: false, reason: "testInputsがありません" };
  }
  // サンプル入力を必ずテストに含める(不足時の補完もここで行う)
  const testInputs = [...p.testInputs.filter((t): t is string => typeof t === "string")];
  for (const s of p.samples) {
    if (!testInputs.includes(s.input)) testInputs.unshift(s.input);
  }
  if (testInputs.length < 4 || testInputs.length > 8) {
    if (testInputs.length > 8) {
      testInputs.length = 8;
    } else {
      return { ok: false, reason: `testInputsは4〜8個必要です(現在${testInputs.length}個)。inputFormatに従った入力を5個作ってください` };
    }
  }
  if (typeof p.referenceSolutions?.python !== "string" || p.referenceSolutions.python.trim() === "") {
    return { ok: false, reason: "referenceSolutions.pythonがありません" };
  }

  const combined = `${p.title}\n${p.statement}\n${p.inputFormat}\n${p.outputFormat}\n${p.referenceSolutions.python}`;
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    if (pattern.test(combined)) {
      return { ok: false, reason: `${label}を含む問題は作れません。標準入出力だけで解ける問題にしてください` };
    }
  }

  return {
    ok: true,
    problem: {
      title: p.title,
      statement: p.statement,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      constraints: p.constraints.map(String),
      samples: p.samples.map((s) => ({ input: s.input, output: s.output })),
      testInputs,
      referenceSolutions: {
        python: p.referenceSolutions.python,
        c: p.referenceSolutions.c,
        javascript: p.referenceSolutions.javascript,
      },
      hints: Array.isArray(p.hints) ? p.hints.map(String) : [],
      explanation: typeof p.explanation === "string" ? p.explanation : "",
    },
  };
}
