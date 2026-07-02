import type { GenerateProblemInput } from "@/types/problem";
import type { Review } from "@/types/submission";
import type { JudgeResult } from "@/types/judge";
import type { ProblemSpec } from "@/lib/problem/schema";

const LANGUAGE_NAMES: Record<string, string> = {
  c: "C言語",
  python: "Python",
  javascript: "JavaScript",
};

/**
 * 【2段階生成 / 第1段階】問題仕様(コードなし)のプロンプト。
 * 小さいモデルは「1回で全部」だと崩れるので、まず問題文と入力例だけを作らせる。
 * コードは含めない(コード例を出すとそれをエコーして本文を書かない挙動を誘発するため)。
 */
export function buildSpecPrompt(input: GenerateProblemInput, failureReason?: string): {
  system: string;
  user: string;
} {
  const langName = LANGUAGE_NAMES[input.language] ?? input.language;

  const system = `あなたは初心者向けプログラミング教材の作成者です。自動採点できる問題の「仕様」だけを、指定の見出し形式で日本語で作ります。コードは書きません。前置き・あいさつは書きません。`;

  const sourceSection = input.sourceContext
    ? `\n参考(この内容・概念に沿ったオリジナル問題にする。文章はコピーしない):\n${input.sourceContext}\n`
    : "";
  const failureSection = failureReason ? `\n前回はこの理由で不合格でした。直してください: ${failureReason}\n` : "";

  const user = `下の完成例と同じ見出し(英語のブラケット見出し)を使い、中身だけを新しい問題に変えてください。見出しの名前は変えないこと。全ての見出しを上から順に必ず書くこと。コードは書かないこと。

===完成例===
[TITLE]
2つの数の和
[STATEMENT]
2つの整数 A と B が1行で与えられます。A と B の合計を出力してください。
[INPUT_FORMAT]
1行に整数 A と B が半角スペース区切りで与えられる。
[OUTPUT_FORMAT]
A + B の値を1行で出力する。
[CONSTRAINTS]
- 0 <= A <= 100
- 0 <= B <= 100
[INPUTS]
3 5
====
0 0
====
100 100
====
10 20
====
1 99
[HINTS]
- 入力を2つの数に分けて考えます。
- input().split() と int() を使います。
- 2つの数を足して print します。
[EXPLANATION]
2つの数を整数に変換して足すだけの問題です。
[END]
===完成例ここまで===

上とまったく同じ見出しで、次の条件の新しい問題を1問だけ作ってください。
- 難易度: ${input.difficulty}
- 単元: ${input.topic}(${langName}の初心者向け)
- 標準入力から読み、標準出力に書くだけで解ける、出力が一意に決まる問題にする。
- 乱数・時刻・ファイル・ネットワークは使わない。値は int の範囲。
- [INPUTS] は ==== の行で区切って5個。すべて [INPUT_FORMAT] に従う有効な入力にする。${sourceSection}${failureSection}`;

  return { system, user };
}

/**
 * 【2段階生成 / 第2段階】Python模範解答のプロンプト。
 * 問題文と入力形式を渡して、コードだけを書かせる(小さいモデルが最も得意なタスク)。
 */
export function buildSolutionPrompt(spec: ProblemSpec): { system: string; user: string } {
  const system = `あなたは正確なPythonプログラマです。与えられた問題を解くPython3プログラムだけを出力します。説明文は書かず、コードだけを出力します。`;

  const user = `次の問題を解くPython3プログラムを書いてください。標準入力(input())から読み、答えを print で出力します。コードだけを出力してください。

# 問題
${spec.statement}

# 入力形式
${spec.inputFormat}

# 出力形式
${spec.outputFormat}

# 入力の例
${spec.inputs[0] ?? ""}

必ず動作する完全なコードを書いてください。`;

  return { system, user };
}

/**
 * 問題生成プロンプト。
 * 重要: expectedはAIに作らせない。testInputsとreferenceSolutions.pythonを作らせ、
 * 実際の期待出力はPyodideでreferenceSolutions.pythonを実行して生成する。
 */
export function buildProblemPrompt(input: GenerateProblemInput, failureReason?: string): {
  system: string;
  user: string;
} {
  const langName = LANGUAGE_NAMES[input.language] ?? input.language;

  const system = `あなたは初心者向けプログラミング教材の作成者です。自動採点可能なプログラミング問題を1問、指定されたセクション形式だけで出力します。前置き・あいさつ・余計な説明は書きません。`;

  const sourceSection = input.sourceContext
    ? `\n\n以下の教材の内容・概念を参考に、オリジナルの問題を作ってください(教材の文章をそのままコピーしないこと):\n---\n${input.sourceContext}\n---`
    : "";

  const failureSection = failureReason
    ? `\n\n前回の生成は次の理由で不合格でした。同じ失敗をしないでください:\n${failureReason}`
    : "";

  const user = `下は出力フォーマットの「完成例」です。この例とまったく同じ見出し([TITLE] や [PYTHON] など、英語のブラケット見出し)を使い、中身だけを新しい問題に差し替えて出力してください。

★重要な決まり★
- 見出しは [TITLE] [STATEMENT] [INPUT_FORMAT] [OUTPUT_FORMAT] [CONSTRAINTS] [SAMPLE_INPUT] [SAMPLE_OUTPUT] [TEST_INPUTS] [PYTHON] [HINTS] [EXPLANATION] [END] を、この英語のまま必ず使う。見出しの名前を日本語にしたり変えたりしない。
- 11個の見出しをすべて省略せず、上から順に書く。
- 見出しの次の行から中身を書く。中身は日本語(コードはPython)。
- JSONにはしない。余計な前置きやコードフェンス(\`\`\`)は書かない。

===完成例ここから===
[TITLE]
2つの数の和
[STATEMENT]
2つの整数 A と B が1行で与えられます。A と B の合計を出力してください。
[INPUT_FORMAT]
1行に整数 A と B が半角スペース区切りで与えられる。
[OUTPUT_FORMAT]
A + B の値を1行で出力する。
[CONSTRAINTS]
- 0 <= A <= 100
- 0 <= B <= 100
[SAMPLE_INPUT]
3 5
[SAMPLE_OUTPUT]
8
[TEST_INPUTS]
3 5
====
0 0
====
100 100
====
10 20
====
1 99
[PYTHON]
a, b = map(int, input().split())
print(a + b)
[HINTS]
- 入力を2つの数に分けて考えます。
- input().split() と int() を使います。
- 2つの数を足して print します。
[EXPLANATION]
input().split() で2つの文字列に分け、int() で整数に変換して足し算します。
[END]
===完成例ここまで===

では、上とまったく同じ見出しで、次の条件の新しい問題を1問だけ作ってください。
- 難易度: ${input.difficulty}
- 単元: ${input.topic}
- 言語: ${langName}(ただし模範解答は必ず [PYTHON] にPythonで書く)
- 標準入力から読み、標準出力に書くだけで解ける問題にする
- 出力が一意に決まる問題にする(乱数・現在時刻・順不同の出力は禁止)
- ファイル操作・ネットワーク・OS依存の処理は禁止。値は int の範囲内。
- [TEST_INPUTS] は ==== の行で区切って5個。1個目は [SAMPLE_INPUT] と同じにする。
- [PYTHON] は必ず動くコードにする。期待出力は書かない。${sourceSection}${failureSection}`;

  return { system, user };
}

/**
 * AIレビュー生成プロンプト。
 * 正誤判定はJudge Engineが済ませており、AIはレビュー文の生成だけを行う。
 */
export function buildReviewPrompt(params: {
  problemTitle: string;
  statement: string;
  language: string;
  code: string;
  judgeResult: JudgeResult;
}): { system: string; user: string } {
  const { judgeResult } = params;
  const langName = LANGUAGE_NAMES[params.language] ?? params.language;

  const failedInfo = judgeResult.failedCase
    ? `
失敗したテストケース:
入力:
${judgeResult.failedCase.input}
期待する出力:
${judgeResult.failedCase.expected}
実際の出力:
${judgeResult.failedCase.actual}
${judgeResult.failedCase.errorMessage ? `エラー内容:\n${judgeResult.failedCase.errorMessage}` : ""}`
    : "";

  const system = `あなたはプログラミング初心者にやさしいメンターです。判定結果はすでに確定しています。あなたは判定を変えず、初心者を励ましながら短くレビューします。指定されたセクション形式だけで出力します。`;

  const user = `以下の提出をレビューしてください。

問題: ${params.problemTitle}
${params.statement}

言語: ${langName}
判定結果: ${judgeResult.status}(${judgeResult.passedCount}/${judgeResult.totalCount} ケース合格)
${failedInfo}

提出コード:
${params.code}

下の例と同じ見出し([CAUSE] [DIRECTION] [NEXT_STEP])を使い、中身だけを今回の提出に合わせて書いてください。見出しは英語のまま、3つとも必ず書いてください。JSONにはしないでください。

===出力例===
[CAUSE]
入力は正しく読めていますが、合計を出力する部分の計算が期待値と違っています。
[DIRECTION]
2つの数を足す式が正しいか、変数の使い方を見直してみましょう。
[NEXT_STEP]
まず a + b を print する形になっているか確認してみましょう。
[END]
===出力例ここまで===

今回の提出に合わせて、上と同じ見出しで書いてください。ACの場合は、CAUSEに良かった点、DIRECTIONにさらに良くする案、NEXT_STEPに次に挑戦すると良いことを書いてください。`;

  return { system, user };
}

export type ReviewJSON = Pick<Review, "cause" | "direction" | "nextStep">;

// 見出しの別名(装飾・同一行本文・大文字小文字・全角括弧・日本語見出しに耐える)
const REVIEW_ALIASES: Array<[RegExp, "CAUSE" | "DIRECTION" | "NEXT_STEP"]> = [
  [/CAUSE|原因|理由/i, "CAUSE"],
  [/DIRECTION|直す方向|方針|改善/i, "DIRECTION"],
  [/NEXT[_\s]*STEP|次の一手|次にやること|次の一歩/i, "NEXT_STEP"],
];

/**
 * レビューのセクション形式を寛容にパースする。
 * 1つでも項目が取れれば部分結果を返す(取れなかった項目は空文字)。全滅時のみnull。
 */
export function parseDelimitedReview(text: string): ReviewJSON | null {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current) sections[current] = (sections[current] ? sections[current] + "\n" : "") + buffer.join("\n").trim();
    buffer = [];
  };
  const unfenced = text.replace(/^\s*```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "");
  for (const rawLine of unfenced.replace(/\r\n/g, "\n").split("\n")) {
    const cleaned = rawLine
      .replace(/[［【]/g, "[")
      .replace(/[］】]/g, "]")
      .replace(/：/g, ":")
      .trim()
      .replace(/^[#>\-*\s]+/, "");
    const m = cleaned.match(/^\**\[?\s*([A-Za-z_ ]+|[ぁ-んァ-ヶ一-龠]+)[\]*:\s]*(.*)$/);
    let matchedKey: string | null = null;
    let rest = "";
    if (m) {
      const token = m[1].trim();
      rest = (m[2] ?? "").trim();
      for (const [re, key] of REVIEW_ALIASES) {
        if (new RegExp(`^(?:${re.source})$`, re.flags).test(token) || (/^\[.+\]$/.test(cleaned) && re.test(token))) {
          matchedKey = key;
          break;
        }
      }
    }
    if (matchedKey) {
      flush();
      current = matchedKey;
      if (rest) buffer.push(rest);
    } else if (current) {
      buffer.push(rawLine);
    }
  }
  flush();
  if (!sections.CAUSE && !sections.DIRECTION && !sections.NEXT_STEP) return null;
  return {
    cause: sections.CAUSE ?? "",
    direction: sections.DIRECTION ?? "",
    nextStep: sections.NEXT_STEP ?? "",
  };
}
