import { describe, expect, it } from "vitest";
import { checkSqlProblem, parseSqlProblem, type RawSqlProblem } from "./sqlProblem";

const SETUP_A = "CREATE TABLE t (id INTEGER, name TEXT);\nINSERT INTO t VALUES (1,'a');";
const SETUP_B = "CREATE TABLE t (id INTEGER, name TEXT);\nINSERT INTO t VALUES (2,'b');";
const SETUP_C = "CREATE TABLE t (id INTEGER, name TEXT);\nINSERT INTO t VALUES (3,'c');";

function validProblem(overrides: Partial<RawSqlProblem> = {}): RawSqlProblem {
  return {
    title: "名前を取り出す",
    statement: "t テーブルから名前を取り出して、id の小さい順に並べてください。",
    schemaText: "t(id 整数, name 文字列)",
    setups: [SETUP_A, SETUP_B, SETUP_C],
    referenceSql: "SELECT name FROM t ORDER BY id ASC;",
    hints: ["ORDER BY を使います"],
    explanation: "ORDER BY id ASC で id の小さい順に並べます。",
    ...overrides,
  };
}

describe("parseSqlProblem", () => {
  it("見出しごとに切り出し、SETUPSを====で分ける", () => {
    const raw = parseSqlProblem(
      [
        "[TITLE]",
        "本を選ぶ",
        "[STATEMENT]",
        "books から取り出してください。",
        "[SCHEMA]",
        "books(id 整数, title 文字列)",
        "[SETUPS]",
        SETUP_A,
        "====",
        SETUP_B,
        "[SQL]",
        "SELECT title FROM books ORDER BY id;",
        "[HINTS]",
        "- ORDER BY を使います",
        "[EXPLANATION]",
        "id の順に並べます。",
        "[END]",
      ].join("\n"),
    );
    expect(raw.title).toBe("本を選ぶ");
    expect(raw.setups).toHaveLength(2);
    expect(raw.setups[0]).toContain("INSERT INTO t VALUES (1,'a')");
    expect(raw.referenceSql).toBe("SELECT title FROM books ORDER BY id;");
    expect(raw.hints).toEqual(["ORDER BY を使います"]);
  });

  it("[SQL]がコードフェンスで囲まれていても剥がす", () => {
    const raw = parseSqlProblem(["[SQL]", "```sql", "SELECT 1 ORDER BY 1;", "```", "[END]"].join("\n"));
    expect(raw.referenceSql).toBe("SELECT 1 ORDER BY 1;");
  });
});

describe("checkSqlProblem", () => {
  it("そろっていれば通る", () => {
    expect(checkSqlProblem(validProblem())).toEqual({ ok: true });
  });

  it("ORDER BYが無い模範解答は落とす(並び順が決まらないと採点できない)", () => {
    const result = checkSqlProblem(validProblem({ referenceSql: "SELECT name FROM t;" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("ORDER BY");
  });

  it("SELECT以外の模範解答は落とす", () => {
    const result = checkSqlProblem(validProblem({ referenceSql: "DELETE FROM t ORDER BY id;" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("SELECT");
  });

  it("データが少なすぎる問題は落とす(答えをそのまま書いても通るため)", () => {
    const result = checkSqlProblem(validProblem({ setups: [SETUP_A, SETUP_B] }));
    expect(result.ok).toBe(false);
  });

  it("同じデータが並んでいる問題は落とす", () => {
    const result = checkSqlProblem(validProblem({ setups: [SETUP_A, SETUP_A, SETUP_B] }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("同じ内容");
  });

  it("INSERTが無いセットアップは落とす", () => {
    const result = checkSqlProblem(
      validProblem({ setups: [SETUP_A, SETUP_B, "CREATE TABLE t (id INTEGER, name TEXT);"] }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("INSERT");
  });

  it("random()を使う問題は落とす(実行のたびに結果が変わる)", () => {
    const result = checkSqlProblem(validProblem({ referenceSql: "SELECT name FROM t ORDER BY random();" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("random()");
  });

  it("現在時刻を使う問題は落とす", () => {
    const result = checkSqlProblem(
      validProblem({ referenceSql: "SELECT name FROM t WHERE d < date('now') ORDER BY id;" }),
    );
    expect(result.ok).toBe(false);
  });

  it("問題文が短すぎる場合は落とす", () => {
    expect(checkSqlProblem(validProblem({ statement: "取り出して" })).ok).toBe(false);
  });
});
