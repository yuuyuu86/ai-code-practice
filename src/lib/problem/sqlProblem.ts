import { parseSections, sectionToList, splitInputBlocks } from "./schema";

/**
 * SQL問題の生の生成結果。
 *
 * 他言語の問題と違い「標準入力」は無い。代わりに setups(テーブル定義+データ投入SQL)が
 * テストケースの役割を持ち、同じ問い合わせを違うデータに対して実行して採点する。
 * これで「答えをベタ書きすれば通る」問題にならないようにしている。
 */
export type RawSqlProblem = {
  title: string;
  statement: string;
  schemaText: string;
  /** テストごとのセットアップSQL(1件目がサンプル) */
  setups: string[];
  referenceSql: string;
  hints: string[];
  explanation: string;
};

export function parseSqlProblem(text: string): RawSqlProblem {
  const sections = parseSections(text);
  return {
    title: sections.TITLE ?? "",
    statement: sections.STATEMENT ?? "",
    schemaText: sections.SCHEMA ?? "",
    setups: splitInputBlocks(sections.SETUPS),
    referenceSql: stripCodeFence(sections.SQL ?? ""),
    hints: sectionToList(sections.HINTS),
    explanation: sections.EXPLANATION ?? "",
  };
}

function stripCodeFence(raw: string): string {
  return raw
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export type SqlCheckResult = { ok: true } | { ok: false; reason: string };

/** 危険・非決定的なSQL。採点できないか、端末を壊す恐れがあるもの。 */
const FORBIDDEN_SQL = [
  { pattern: /\brandom\s*\(/i, reason: "random()は実行のたびに結果が変わるため採点できません" },
  { pattern: /\bdatetime\s*\(\s*['"]now/i, reason: "現在時刻を使うと実行のたびに結果が変わるため採点できません" },
  { pattern: /\bdate\s*\(\s*['"]now/i, reason: "現在時刻を使うと実行のたびに結果が変わるため採点できません" },
  { pattern: /\battach\b/i, reason: "ATTACHは使えません" },
  { pattern: /\bpragma\b/i, reason: "PRAGMAは使えません" },
];

const MIN_SETUPS = 3;

/**
 * SQL問題の構造検証。
 *
 * 出力比較で採点するので、行の並び順が毎回同じでないと正解が定まらない。
 * SQLiteはORDER BYが無ければ順序を保証しないため、模範解答にORDER BYを必須にする。
 */
export function checkSqlProblem(raw: RawSqlProblem): SqlCheckResult {
  if (raw.title.trim().length < 2) return { ok: false, reason: "タイトルがありません" };
  if (raw.statement.trim().length < 15) {
    return { ok: false, reason: "問題文が短すぎます。何を取り出すのかを日本語で説明してください" };
  }
  if (raw.schemaText.trim() === "") {
    return { ok: false, reason: "[SCHEMA]にテーブルの説明がありません" };
  }

  if (raw.setups.length < MIN_SETUPS) {
    return {
      ok: false,
      reason: `[SETUPS]が${raw.setups.length}個しかありません。データ違いで${MIN_SETUPS}個以上に分けてください(答えをそのまま書いても通らないようにするため)`,
    };
  }
  for (const setup of raw.setups) {
    if (!/create\s+table/i.test(setup)) {
      return { ok: false, reason: "[SETUPS]の各ブロックにはCREATE TABLEとINSERTの両方を書いてください" };
    }
    if (!/insert\s+into/i.test(setup)) {
      return { ok: false, reason: "[SETUPS]の各ブロックにINSERT INTOがありません。データを入れてください" };
    }
  }
  // 全部同じデータだと、テストを分ける意味が無い
  if (new Set(raw.setups).size !== raw.setups.length) {
    return { ok: false, reason: "[SETUPS]に同じ内容のブロックがあります。データを変えてください" };
  }

  const sql = raw.referenceSql;
  if (!/^\s*select\b/i.test(sql)) {
    return { ok: false, reason: "[SQL]はSELECT文で書いてください" };
  }
  if (!/\border\s+by\b/i.test(sql)) {
    return {
      ok: false,
      reason: "[SQL]にORDER BYがありません。並び順が決まらないと正誤を判定できないので必ず付けてください",
    };
  }
  for (const { pattern, reason } of FORBIDDEN_SQL) {
    if (pattern.test(sql) || raw.setups.some((s) => pattern.test(s))) return { ok: false, reason };
  }

  if (raw.hints.length === 0) return { ok: false, reason: "[HINTS]が空です" };
  if (raw.explanation.trim().length < 10) return { ok: false, reason: "[EXPLANATION]が短すぎます" };

  return { ok: true };
}
