import type { GenerateProblemInput } from "@/types/problem";
import type { Review } from "@/types/submission";
import type { JudgeResult } from "@/types/judge";
import type { ProblemOutline, ProblemSpec } from "@/lib/problem/schema";

const LANGUAGE_NAMES: Record<string, string> = {
  c: "C言語",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL",
};

const DIFFICULTY_REQUIREMENTS: Record<string, string[]> = {
  入門: [
    "1回の計算か、1つの簡単な判定だけで解ける内容にする。",
    "入力の種類は1〜2個に抑え、長い手順は要求しない。",
  ],
  初級: [
    "少なくとも3段階の処理で解ける内容にする。",
    "if か for のどちらか一方を自然に使う問題にする。",
    "入力を読んでそのまま1回計算して終わる問題にはしない。",
    "少なくとも1つは中間結果を作ってから答えを出すようにする。",
  ],
  中級: [
    "2つ以上の処理を組み合わせる問題にする。例: 繰り返し+条件分岐、配列+集計、関数+判定。",
    "少なくとも4段階の手順が必要な問題にする。1回の式変形だけで終わらせない。",
    "少なくとも1か所は、途中結果を整理しないと間違えやすい手順を入れる。",
    "入力が複数個ある場合は、それぞれの値の関係を使って判断や集計を行うようにする。",
    "単純な合計・平均・最大最小だけを出す問題にはしない。",
    "条件分岐か繰り返しのどちらかは必須にし、できれば両方使う問題にする。",
    "ただし特殊なアルゴリズムや高度なデータ構造は使わない。",
  ],
  上級: [
    "基礎文法の組み合わせで解けるが、手順を自分で設計する必要がある問題にする。",
    "少なくとも5段階の処理を含める。例: 入力の整形→走査→中間集計→追加判定→条件に応じた出力。",
    "複数条件や複数要素の集計を扱い、1つ以上の見落としやすいケース分けを含める。",
    "単純な最大値・最小値を出すだけ、合計を出すだけ、1回の if で終わる問題にはしない。",
    "配列・繰り返し・条件分岐のうち少なくとも2種類を自然に使う問題にする。",
    "少なくとも1回は、途中で作った値を使ってさらに別の判断や計算を行うようにする。",
    "入力の複数要素をまとめて見ないと解けない問題にする。",
    "ただし競技プログラミング寄りの難問や特殊なアルゴリズムにはしない。",
  ],
};

const TOPIC_REQUIREMENTS: Record<string, string[]> = {
  入出力: ["入力値をそのまま表示し直すだけではなく、少なくとも1回は加工してから出力する。"],
  "変数・計算": ["四則演算や中間変数の使い分けが必要になるようにする。"],
  条件分岐: ["条件は1つだけで終わらせず、else まで含めて分岐が必要な問題にする。"],
  繰り返し: ["ループを1回以上使わないと解けない問題にする。"],
  配列: ["複数要素を読み取り、少なくとも1回は配列全体を走査する必要がある問題にする。"],
  関数: ["処理を関数に分けると自然に解ける問題にする。"],
};

function buildConstraintLines(input: GenerateProblemInput): string {
  return [...(DIFFICULTY_REQUIREMENTS[input.difficulty] ?? []), ...(TOPIC_REQUIREMENTS[input.topic] ?? [])]
    .map((line) => `- ${line}`)
    .join("\n");
}

function buildReferenceSection(referenceExample?: string): string {
  return referenceExample
    ? `\n参考: 過去に検証を通過した良い問題の例です。構成や難易度感の参考にはしてよいですが、題材・数値・文章は流用せず、別の新しい問題を作ってください。\n${referenceExample}\n`
    : "";
}

/**
 * 【3段階生成 / 第1段階】問題の骨格だけを作るプロンプト。
 * 小さいモデルは「1回で全部」だと崩れるので、まずタイトル・問題文・入出力形式だけを作らせる。
 * コードは含めない(コード例を出すとそれをエコーして本文を書かない挙動を誘発するため)。
 */
export function buildSpecPrompt(input: GenerateProblemInput, failureReason?: string, referenceExample?: string): {
  system: string;
  user: string;
} {
  const langName = LANGUAGE_NAMES[input.language] ?? input.language;

  const system = `あなたは初心者向けプログラミング教材の作成者です。自動採点できる問題の「仕様」だけを、指定の見出し形式で日本語で作ります。コードは書きません。前置き・あいさつは書きません。`;

  const sourceSection = input.sourceContext
    ? `\n参考(この内容・概念に沿ったオリジナル問題にする。文章はコピーしない):\n${input.sourceContext}\n`
    : "";
  const referenceSection = buildReferenceSection(referenceExample);
  const failureSection = failureReason ? `\n前回はこの理由で不合格でした。直してください: ${failureReason}\n` : "";
  const extraConstraints = buildConstraintLines(input);

  const user = `下の完成例と同じ見出し(英語のブラケット見出し)を使い、中身だけを新しい問題に変えてください。今回は [TITLE] [STATEMENT] [INPUT_FORMAT] [OUTPUT_FORMAT] [END] だけを書きます。コードは書かないこと。

重要:
- [TITLE] [STATEMENT] [INPUT_FORMAT] [OUTPUT_FORMAT] の中身は、必ず自然な日本語で書く。
- 見出し名そのもの([TITLE]など)以外は英語で書かない。
- タイトルは日本語の問題名だけにする。「Advanced」「Level」「Beginner」などの英語ラベルやレベル表記を付けない。
- 難易度に合わない簡単すぎる問題にしない。入門以外では「2つの数の和」のような1回の足し算だけで終わる問題は禁止。完成例の題材(2つの数の和)はそのまま使わず、別の題材にする。
- [CONSTRAINTS] [INPUTS] [HINTS] [EXPLANATION] はまだ書かない。
- 必ず [TITLE] から始めて、最後は [END] で終える。
- 5つの見出し以外は1文字も書かない。説明や注意書きの追記は禁止。
- 空欄は禁止。各見出しの直後に必ず1行以上の日本語を書く。

===完成例===
[TITLE]
2つの数の和
[STATEMENT]
2つの整数 A と B が1行で与えられます。A と B の合計を出力してください。
[INPUT_FORMAT]
1行に整数 A と B が半角スペース区切りで与えられる。
[OUTPUT_FORMAT]
A + B の値を1行で出力する。
[END]
===完成例ここまで===

出力テンプレート(この形をそのまま使い、中身だけ変える):
[TITLE]
ここに日本語のタイトル
[STATEMENT]
ここに日本語の問題文
[INPUT_FORMAT]
ここに日本語の入力形式
[OUTPUT_FORMAT]
ここに日本語の出力形式
[END]

上とまったく同じ5つの見出しだけで、次の条件の新しい問題を1問だけ作ってください。
- 難易度: ${input.difficulty}
- 単元: ${input.topic}(${langName}の初心者向け)
- 標準入力から読み、標準出力に書くだけで解ける、出力が一意に決まる問題にする。
- 乱数・時刻・ファイル・ネットワークは使わない。「乱数」「ランダム」という言葉も問題文に書かない。値は int の範囲。
${extraConstraints}${referenceSection}${sourceSection}${failureSection}`;

  return { system, user };
}

/**
 * 【3段階生成 / 第2段階】骨格に対して制約・入力例・ヒント・解説を補う。
 */
export function buildDetailsPrompt(
  input: GenerateProblemInput,
  outline: ProblemOutline,
  failureReason?: string,
  referenceExample?: string,
): { system: string; user: string } {
  const referenceSection = buildReferenceSection(referenceExample);
  const failureSection = failureReason ? `\n前回はこの理由で不合格でした。直してください: ${failureReason}\n` : "";
  const extraConstraints = buildConstraintLines(input);
  const system = `あなたは初心者向けプログラミング教材の作成者です。与えられた問題の骨格に対して、不足している制約・入力例・ヒント・解説だけを日本語で補います。コードは書きません。前置き・あいさつは書きません。`;

  const user = `次の問題の骨格をもとに、[CONSTRAINTS] [INPUTS] [HINTS] [EXPLANATION] だけを書いてください。見出しはこの英語のまま必ず使い、最後に [END] を書いてください。

重要:
- 見出し名以外は必ず自然な日本語で書く。
- [CONSTRAINTS] は最低2行以上書く。
- [INPUTS] は ==== の行で区切って5個書く。
- ==== の区切り行は4回必要です。5個の入力を、1個ずつ区切ってください。
- 5個とも [INPUT_FORMAT] に従う有効な入力にする。
- 1つの極端なケースだけに偏らず、普通のケース・境界に近いケースを混ぜる。
- 問題の骨格は変えない。足りない部分だけ補う。

[CONSTRAINTS] の書き方の例:
[CONSTRAINTS]
- 入力される値はすべて int の範囲に収まる。
- 問題文に書かれていない特別な外部入力はない。

[INPUTS] の書き方の例:
[INPUTS]
3 5
====
0 0
====
10 20
====
1 99
====
100 100

[TITLE]
${outline.title}
[STATEMENT]
${outline.statement}
[INPUT_FORMAT]
${outline.inputFormat}
[OUTPUT_FORMAT]
${outline.outputFormat}

追加条件:
- 難易度: ${input.difficulty}
- 単元: ${input.topic}
${extraConstraints}${referenceSection}${failureSection}`;

  return { system, user };
}

/**
 * 【2段階生成 / 第2段階】Python模範解答のプロンプト。
 * 問題文と入力形式を渡して、コードだけを書かせる(小さいモデルが最も得意なタスク)。
 */
export function buildSolutionPrompt(spec: ProblemSpec, failureReason?: string): { system: string; user: string } {
  const system = `あなたは正確なPythonプログラマです。与えられた問題を解くPython3プログラムだけを出力します。説明文は書かず、コードだけを出力します。`;
  const failureSection = failureReason ? `\n前回はこの理由で不合格でした。直してください: ${failureReason}\n` : "";

  const user = `次の問題を解くPython3プログラムを書いてください。標準入力(input())から読み、答えを print で出力します。コードだけを出力してください。コメントや説明文は書かないでください。

# 問題
${spec.statement}

# 入力形式
${spec.inputFormat}

# 出力形式
${spec.outputFormat}

# 入力の例
${spec.inputs[0] ?? ""}

必ず動作する完全なコードを書いてください。
問題文が日本語でも、出力するのはPythonコードだけです。${failureSection}`;

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
  const extraConstraints = buildConstraintLines(input);

  const user = `下は出力フォーマットの「完成例」です。この例とまったく同じ見出し([TITLE] や [PYTHON] など、英語のブラケット見出し)を使い、中身だけを新しい問題に差し替えて出力してください。

★重要な決まり★
- 見出しは [TITLE] [STATEMENT] [INPUT_FORMAT] [OUTPUT_FORMAT] [CONSTRAINTS] [SAMPLE_INPUT] [SAMPLE_OUTPUT] [TEST_INPUTS] [PYTHON] [HINTS] [EXPLANATION] [END] を、この英語のまま必ず使う。見出しの名前を日本語にしたり変えたりしない。
- 11個の見出しをすべて省略せず、上から順に書く。
- 見出しの次の行から中身を書く。中身は日本語(コードはPython)。
- JSONにはしない。余計な前置きやコードフェンス(\`\`\`)は書かない。
- [TITLE] [STATEMENT] [INPUT_FORMAT] [OUTPUT_FORMAT] [CONSTRAINTS] [SAMPLE_OUTPUT] [HINTS] [EXPLANATION] は必ず自然な日本語で書く。
- 見出し名以外を英語だけの文にしない。
- 難易度に合わない簡単すぎる問題にしない。

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
- [PYTHON] は必ず動くコードにする。期待出力は書かない。
${extraConstraints}${sourceSection}${failureSection}`;

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

  const system = `あなたはプログラミング初心者にやさしいメンターです。判定結果はすでに確定しています。あなたは判定を変えず、初心者を励ましながら短くレビューします。必ず提出コードの中身を読み、どの部分がどうなっているかを具体的に指摘します。指定されたセクション形式だけで出力します。`;

  const user = `以下の提出を、提出コードをよく読んでレビューしてください。

問題: ${params.problemTitle}
${params.statement}

言語: ${langName}
判定結果: ${judgeResult.status}(${judgeResult.passedCount}/${judgeResult.totalCount} ケース合格)
${failedInfo}

提出コード:
${params.code}

レビューの決まり:
- 一般論ではなく、上の提出コードの実際の中身に触れて書く。コード中の変数名・関数・具体的な処理を引用して指摘する。
- 原因は「どの行・どの処理がどうなっているか」を具体的に述べる(例:「n を使ったループの範囲が〜」)。
- 存在しないコードや書いていない処理を勝手に想定しない。実際に書かれているコードだけを根拠にする。
- 答えのコードそのものを書かない。完成したプログラムや修正後のコード全体を提示しない。コードブロック(\`\`\`)も使わない。あくまで日本語の言葉で「どう考えて直すか」の方針だけを伝える(学習者が自分で書けるように)。

下の例と同じ見出し([CAUSE] [DIRECTION] [NEXT_STEP])を使い、中身だけを今回の提出に合わせて書いてください。見出しは英語のまま、3つとも必ず書いてください。JSONにはしないでください。

===出力例===
[CAUSE]
input().split() で入力は読めていますが、合計を求める部分が sum ではなく最初の値だけを出力しています。
[DIRECTION]
足し算の結果を入れる変数を用意して、ループの中で加算していく形に直してみましょう。
[NEXT_STEP]
total = 0 を用意し、各値を total に足してから print(total) する流れを試してみましょう。
[END]
===出力例ここまで===

今回の提出コードに合わせて、上と同じ見出しで書いてください。ACの場合は、CAUSEに提出コードの良かった点(使えている書き方など)、DIRECTIONにさらに良くする案、NEXT_STEPに次に挑戦すると良いことを書いてください。`;

  return { system, user };
}

/**
 * 教材モード(100本ノック)のAIレビュープロンプト。
 *
 * 通常のレビューと違い、この教材には自動採点用のテストケースが無く合否判定を行わない。
 * そのためAIには「問題文の要件をコードと実行結果から見て満たしているか」を判断させる。
 * 出力形式は buildReviewPrompt と同じ [CAUSE][DIRECTION][NEXT_STEP] にして
 * parseDelimitedReview を共用する。
 */
export function buildKnockReviewPrompt(params: {
  knockNo: number;
  title: string;
  statement: string;
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  runType: string;
  /** テストケースによる合否。判定できた場合はAIに判定を覆させない */
  verdict?:
    | { kind: "AC"; passed: number; total: number }
    | {
        kind: "WA";
        passed: number;
        total: number;
        firstFailure: { input: string; expected: string | null; actual: string; reason?: string };
      }
    | { kind: string }
    | null;
}): { system: string; user: string } {
  const runSummary =
    params.runType === "success"
      ? "プログラムは最後まで実行できました"
      : params.runType === "compile-error"
        ? "コンパイルに失敗しました"
        : params.runType === "runtime-error"
          ? "実行の途中でエラーが起きました"
          : params.runType === "timeout"
            ? "時間内に終わりませんでした(無限ループの可能性)"
            : "出力が多すぎて打ち切られました";

  // 合否が確定している場合はそれを事実として渡し、AIに覆させない
  const verdictKind = params.verdict?.kind;
  let verdictSection: string;
  let judgeRule: string;
  if (verdictKind === "AC") {
    const v = params.verdict as { passed: number; total: number };
    verdictSection = `\n判定: 正解(${v.total}件のテストすべてに合格)。この判定は確定しているので覆さないこと。\n`;
    judgeRule = "- 判定は正解なので、CAUSEには良かった点(どの書き方が効いたか)を書く。間違い探しをしない。";
  } else if (verdictKind === "WA") {
    const v = params.verdict as {
      passed: number;
      total: number;
      firstFailure: { input: string; expected: string | null; actual: string; reason?: string };
    };
    const f = v.firstFailure;
    verdictSection = `\n判定: 不正解(${v.total}件中${v.passed}件が合格)。この判定は確定しているので覆さないこと。
失敗したケース:
入力: ${f.input === "" ? "(入力なし)" : f.input}
${f.expected !== null ? `期待する出力:\n${f.expected}` : ""}
実際の出力:
${f.actual}
${f.reason ? `違反した内容: ${f.reason}` : ""}\n`;
    judgeRule =
      "- 判定は不正解。上の「失敗したケース」の入力でなぜその出力になるのかを、コードのどの部分が原因か具体的に述べる。";
  } else {
    verdictSection = "\n判定: この問題は自動判定できないため、要件を満たしているか自分で判断すること。\n";
    judgeRule =
      "- この問題は自動判定していない。問題文の要件を満たしているかを、コードと上の実行結果から自分で判断して述べる。";
  }

  const system = `あなたはプログラミング初心者にやさしいC言語のメンターです。合否の判定はすでに確定している場合があり、その場合あなたは判定を変えません。必ず提出コードの中身を読み、どの部分がどうなっているかを具体的に指摘します。指定されたセクション形式だけで出力します。`;

  const user = `以下の提出を、問題文と提出コードと実行結果をよく読んでレビューしてください。

問題(No.${params.knockNo} ${params.title}):
${params.statement}

提出コード(C言語):
${params.code}

与えた標準入力:
${params.stdin.trim() === "" ? "(なし)" : params.stdin}

実行結果: ${runSummary}
標準出力:
${params.stdout.trim() === "" ? "(出力なし)" : params.stdout}
${params.stderr.trim() === "" ? "" : `エラー出力:\n${params.stderr}`}
${verdictSection}
レビューの決まり:
${judgeRule}
- 一般論ではなく、上の提出コードの実際の中身に触れて書く。コード中の変数名・関数・具体的な処理を引用して指摘する。
- 存在しないコードや書いていない処理を勝手に想定しない。実際に書かれているコードだけを根拠にする。
- 答えのコードそのものを書かない。完成したプログラムや修正後のコード全体を提示しない。コードブロック(\`\`\`)も使わない。日本語の言葉で「どう考えて直すか」の方針だけを伝える(学習者が自分で書けるように)。
- 要件を満たせていそうなら、CAUSEに良かった点を書く。

下の例と同じ見出し([CAUSE] [DIRECTION] [NEXT_STEP])を使い、中身だけを今回の提出に合わせて書いてください。見出しは英語のまま、3つとも必ず書いてください。JSONにはしないでください。

===出力例===
[CAUSE]
scanf で2つの整数を読み取り、printf で和を表示できています。問題文の要件を満たしています。
[DIRECTION]
変数名を a, b から意味の分かる名前にすると、あとで読み返したときに分かりやすくなります。
[NEXT_STEP]
入力の個数を増やした場合にどう書くかを考えてみましょう。
[END]
===出力例ここまで===

今回の提出コードに合わせて、上と同じ見出しで書いてください。`;

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
