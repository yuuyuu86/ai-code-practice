import type { GenerateProblemInput } from "@/types/problem";

const HTML_DIFFICULTY_HINTS: Record<string, string> = {
  入門: "見出しと段落を置くだけ、または文字色を変えるだけの問題にする。JavaScriptは使わない。",
  初級: "リストや画像、簡単なCSS(色・文字サイズ・中央寄せ)までにする。JavaScriptは使わない。",
  中級: "CSSでの配置と、JavaScriptでDOMを組み立てる処理を1つ入れる。",
  上級: "JavaScriptで配列からリストを作る、または条件で表示を変える処理を入れる。",
};

/**
 * HTML+CSS+JS問題の生成プロンプト。
 *
 * この言語は「出力」が無いので、期待する出力の代わりに
 * DOMの調べ方([CHECKS])をAIに書かせる。
 * チェックの種類を5つに絞っているのは、小型モデルでも形を守れるようにするため。
 */
export function buildHtmlProblemPrompt(
  input: GenerateProblemInput,
  failureReason?: string,
): { system: string; user: string } {
  const system = `あなたは初心者向けWeb教材の作成者です。自動採点できるHTML/CSS/JavaScriptの問題を1問、指定されたセクション形式だけで出力します。前置き・あいさつ・余計な説明は書きません。`;

  const sourceSection = input.sourceContext
    ? `\n\n以下の教材の内容・概念を参考に、オリジナルの問題を作ってください(教材の文章をそのままコピーしないこと):\n---\n${input.sourceContext}\n---`
    : "";
  const failureSection = failureReason
    ? `\n\n前回の生成は次の理由で不合格でした。同じ失敗をしないでください:\n${failureReason}`
    : "";

  const user = `下は出力フォーマットの「完成例」です。この例とまったく同じ見出しを使い、中身だけを新しい問題に差し替えて出力してください。

★重要な決まり★
- 見出しは [TITLE] [STATEMENT] [CHECKS] [HTML] [HINTS] [EXPLANATION] [END] を、この英語のまま必ず使う。
- 6個の見出しをすべて省略せず、上から順に書く。
- [TITLE] [STATEMENT] [HINTS] [EXPLANATION] は自然な日本語で書く。
- [HTML] には完成したHTMLを1つだけ書く。CSSは<style>、JavaScriptは<script>の中に入れる。
- [CHECKS] は1行1項目、縦棒 | 区切りで3個以上。使えるのは次の5種類だけ:
  - exists|セレクタ|説明
  - count|セレクタ|個数|説明
  - text|セレクタ|文字|説明
  - attr|セレクタ|属性名|値|説明
  - style|セレクタ|CSSプロパティ|値|説明
- [CHECKS] は必ず [HTML] のページに対して全部が成立するように書く。
- 空のページでも通ってしまうチェックは書かない(何も書かなくても正解になってしまう)。
- 説明は日本語で、何を確かめているかが分かるように書く。

===完成例ここから===
[TITLE]
あいさつのページを作る
[STATEMENT]
h1の見出しに「こんにちは」と表示し、その下に段落を1つ置いてください。見出しの文字色は赤にしてください。
[CHECKS]
exists|h1|大きな見出し(h1)がある
text|h1|こんにちは|見出しの文字が「こんにちは」になっている
count|p|1|段落(p)が1つある
style|h1|color|red|見出しの文字色が赤になっている
[HTML]
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <style>
      h1 { color: red; }
    </style>
  </head>
  <body>
    <h1>こんにちは</h1>
    <p>はじめてのページです。</p>
  </body>
</html>
[HINTS]
- 見出しは h1 タグで書きます。
- 段落は p タグで書きます。
- 文字色は CSS の color で変えられます。
[EXPLANATION]
h1に「こんにちは」と書き、styleの中で h1 { color: red; } と指定すると文字が赤くなります。
[END]
===完成例ここまで===

では、上とまったく同じ見出しで、次の条件の新しい問題を1問だけ作ってください。
- 難易度: ${input.difficulty}
- 単元: ${input.topic}
- ${HTML_DIFFICULTY_HINTS[input.difficulty] ?? ""}
- 完成例と同じ「こんにちは」の問題にはしない
- 外部の画像やCSSファイル、通信は使わない${sourceSection}${failureSection}`;

  return { system, user };
}
