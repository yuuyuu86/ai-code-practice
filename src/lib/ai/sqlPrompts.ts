import type { GenerateProblemInput } from "@/types/problem";

const SQL_DIFFICULTY_HINTS: Record<string, string> = {
  入門: "1つのテーブルから WHERE で絞るだけ、または列を選ぶだけの問題にする。JOINや集計は使わない。",
  初級: "1つのテーブルに対する WHERE と ORDER BY、または COUNT/SUM などの簡単な集計までにする。",
  中級: "GROUP BY と HAVING、または2つのテーブルの JOIN を使う問題にする。",
  上級: "JOIN と集計を組み合わせる、またはサブクエリを使う問題にする。",
};

/**
 * SQL問題の生成プロンプト。
 *
 * 他言語と同じく、期待する出力はAIに書かせない。
 * [SETUPS] のデータと [SQL] の模範解答をAIに作らせ、
 * 実際の期待出力はsql.js(SQLite)で模範解答を実行して作る。
 *
 * [SETUPS] を複数に分けているのは、データ違いで何度も採点するため。
 * 1つしか無いと、結果を直接書いたSELECTでも通ってしまう。
 */
export function buildSqlProblemPrompt(
  input: GenerateProblemInput,
  failureReason?: string,
): { system: string; user: string } {
  const system = `あなたは初心者向けSQL教材の作成者です。自動採点できるSQLの問題を1問、指定されたセクション形式だけで出力します。前置き・あいさつ・余計な説明は書きません。`;

  const sourceSection = input.sourceContext
    ? `\n\n以下の教材の内容・概念を参考に、オリジナルの問題を作ってください(教材の文章をそのままコピーしないこと):\n---\n${input.sourceContext}\n---`
    : "";
  const failureSection = failureReason
    ? `\n\n前回の生成は次の理由で不合格でした。同じ失敗をしないでください:\n${failureReason}`
    : "";

  const user = `下は出力フォーマットの「完成例」です。この例とまったく同じ見出しを使い、中身だけを新しい問題に差し替えて出力してください。

★重要な決まり★
- 見出しは [TITLE] [STATEMENT] [SCHEMA] [SETUPS] [SQL] [HINTS] [EXPLANATION] [END] を、この英語のまま必ず使う。
- 7個の見出しをすべて省略せず、上から順に書く。
- [TITLE] [STATEMENT] [SCHEMA] [HINTS] [EXPLANATION] は自然な日本語で書く。
- JSONにはしない。コードフェンス(\`\`\`)は書かない。
- [SETUPS] は ==== の行で区切って3個以上。各ブロックにCREATE TABLEとINSERT INTOの両方を書き、ブロックごとに入れるデータを変える。
- [SQL] はSELECT文1つだけ。必ずORDER BYを付ける(並び順が決まらないと採点できない)。
- random() や現在時刻は使わない。実行のたびに結果が変わる問題は作らない。

===完成例ここから===
[TITLE]
点数が高い生徒を選ぶ
[STATEMENT]
students テーブルから、点数(score)が70以上の生徒の名前と点数を取り出してください。点数の高い順に並べ、点数が同じときは名前のアルファベット順に並べてください。
[SCHEMA]
students(id 整数, name 文字列, score 整数)
[SETUPS]
CREATE TABLE students (id INTEGER, name TEXT, score INTEGER);
INSERT INTO students VALUES (1, 'ann', 80), (2, 'bob', 65), (3, 'cid', 95);
====
CREATE TABLE students (id INTEGER, name TEXT, score INTEGER);
INSERT INTO students VALUES (1, 'dan', 70), (2, 'eve', 70), (3, 'fay', 40);
====
CREATE TABLE students (id INTEGER, name TEXT, score INTEGER);
INSERT INTO students VALUES (1, 'gus', 10), (2, 'hana', 20);
[SQL]
SELECT name, score FROM students WHERE score >= 70 ORDER BY score DESC, name ASC;
[HINTS]
- WHERE で条件に合う行だけに絞ります。
- ORDER BY に2つの列を書くと、1つ目が同じときに2つ目で並びます。
- DESC は大きい順、ASC は小さい順です。
[EXPLANATION]
WHERE score >= 70 で70点以上に絞り、ORDER BY score DESC, name ASC で点数の高い順、同点なら名前順に並べます。
[END]
===完成例ここまで===

では、上とまったく同じ見出しで、次の条件の新しい問題を1問だけ作ってください。
- 難易度: ${input.difficulty}
- 単元: ${input.topic}
- ${SQL_DIFFICULTY_HINTS[input.difficulty] ?? ""}
- 完成例と同じ students テーブルは使わず、別の題材にする
- 使えるのはSQLiteの標準的な構文だけ${sourceSection}${failureSection}`;

  return { system, user };
}
