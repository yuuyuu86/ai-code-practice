/** AIが返す生の問題JSON(expected生成前) */
export type RawGeneratedProblem = {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  samples: Array<{ input: string; output: string }>;
  testInputs: string[];
  referenceSolutions: { python: string; c?: string; javascript?: string };
  hints: string[];
  explanation: string;
};

/**
 * LLMの出力からJSON部分を取り出してパースする。
 * コードフェンスや前後の説明文が混ざるケースに耐える。
 */
export function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  // まず素直にパース
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fallthrough */
  }
  // コードフェンス除去
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  // 最初の { から最後の } まで
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* fallthrough */
    }
  }
  throw new Error("JSONとして解釈できませんでした");
}

/**
 * 区切り記号ベースのセクション形式をパースする。
 *
 * 小さいモデルはPythonコードをJSON文字列に埋め込む(改行/引用符のエスケープ)のが苦手で、
 * ほぼ必ずJSONを壊す。そこでコードを生テキストのまま出力させ、[SECTION]見出しで区切る。
 * これによりエスケープが一切不要になり、生成成功率が大きく上がる。
 *
 * 期待する形式:
 *   [TITLE] ... [STATEMENT] ... [INPUT_FORMAT] ... [OUTPUT_FORMAT] ...
 *   [CONSTRAINTS] (- 行) ... [SAMPLE_INPUT] ... [SAMPLE_OUTPUT] ...
 *   [TEST_INPUTS] (==== で区切る) ... [PYTHON] <コード> ... [HINTS] (- 行) ... [EXPLANATION] ... [END]
 */
// 見出し候補 → 正規キー。長い別名を先に並べる(正規表現の左優先マッチ対策)。
const HEADER_ALIASES: Array<[RegExp, string]> = [
  [/TITLE|タイトル/i, "TITLE"],
  [/STATEMENT|PROBLEM|問題文|問題/i, "STATEMENT"],
  [/INPUT[_\s]*FORMAT|入力形式/i, "INPUT_FORMAT"],
  [/OUTPUT[_\s]*FORMAT|出力形式/i, "OUTPUT_FORMAT"],
  [/CONSTRAINTS?|制約/i, "CONSTRAINTS"],
  [/SAMPLE[_\s]*INPUT|入力例|サンプル入力/i, "SAMPLE_INPUT"],
  [/SAMPLE[_\s]*OUTPUT|出力例|サンプル出力/i, "SAMPLE_OUTPUT"],
  [/TEST[_\s]*INPUTS?|TESTS?|テスト入力|テストケース/i, "TEST_INPUTS"],
  [/INPUTS|入力一覧|入力群/i, "INPUTS"],
  [/PYTHON|SOLUTION|CODE|模範解答|解答/i, "PYTHON"],
  [/HINTS?|ヒント/i, "HINTS"],
  [/EXPLANATION|解説|説明/i, "EXPLANATION"],
  [/END/i, "END"],
];

/**
 * 1行が見出しなら {key, rest} を返す。見出しでなければ null。
 * 装飾(#, *, >, 全角/半角括弧, コロン)や、見出しと本文が同じ行にあるケースに耐える。
 */
function matchHeader(line: string): { key: string; rest: string } | null {
  // 全角括弧・コロンを半角化し、markdown装飾を除去
  const cleaned = line
    .replace(/[［【]/g, "[")
    .replace(/[］】]/g, "]")
    .replace(/：/g, ":")
    .trim()
    .replace(/^[#>\-*\s]+/, "");
  // [KEY] / **KEY** / KEY: いずれの囲みも許容して見出しトークンと残りを取り出す
  // 見出しトークンの後ろの装飾(] * : スペース)をまとめて除去してから本文を取る
  const m = cleaned.match(/^\**\[?\s*([A-Za-z_ ]+|[ぁ-んァ-ヶ一-龠]+)[\]*:：\s]*(.*)$/);
  if (!m) return null;
  const token = m[1].trim();
  const rest = m[2] ?? "";
  for (const [re, key] of HEADER_ALIASES) {
    // トークン全体が別名に一致する場合のみ見出しとみなす(誤検出防止)
    if (new RegExp(`^(?:${re.source})$`, re.flags).test(token)) {
      return { key, rest: rest.trim() };
    }
  }
  // フォールバック: 行全体が [ ... ] で囲まれている場合のみ、部分一致で見出し判定。
  // 弱いモデルが [問題のタイトル] のようにプレースホルダーを見出しにするケースを救う。
  const bracketed = cleaned.replace(/^\**/, "").trim();
  if (/^\[.+\]$/.test(bracketed)) {
    for (const [re, key] of HEADER_ALIASES) {
      if (key !== "END" && re.test(token)) {
        return { key, rest: rest.trim() };
      }
    }
  }
  return null;
}

/** テキストを [見出し] ごとのセクション辞書に分解する(汎用) */
export function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  // 全体を囲むコードフェンスがあれば剥がす
  const unfenced = text.replace(/^\s*```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "");
  const lines = unfenced.replace(/\r\n/g, "\n").split("\n");
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current) sections[current] = (sections[current] ? sections[current] + "\n" : "") + buffer.join("\n").trim();
    buffer = [];
  };
  for (const line of lines) {
    const h = matchHeader(line);
    if (h) {
      flush();
      current = h.key === "END" ? null : h.key;
      if (current && h.rest) buffer.push(h.rest); // 見出しと同じ行の本文を拾う
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

/** 箇条書き/改行区切りのブロックを配列に */
export function sectionToList(raw: string | undefined): string[] {
  return (raw || "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-*・\d.]+\s*/, "").trim())
    .filter((l) => l.length > 0);
}

/** 複数の入力を区切り(====, ----, 「テスト2」見出し等)で分割 */
export function splitInputBlocks(raw: string | undefined): string[] {
  return (raw || "")
    .split(/^\s*(?:[=~#-]{3,}|(?:テスト|ケース|入力|test|case|input)\s*\d+.*)\s*$/im)
    .map((t) => t.replace(/^\n+|\n+$/g, ""))
    .filter((t) => t.trim().length > 0);
}

/** ```python ... ``` フェンスや前後の地の文を取り除いてコード本体を得る */
export function extractCode(raw: string): string {
  const fenced = raw.match(/```(?:python|py)?\s*\n?([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return raw.replace(/^```(?:python|py)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

/** 1段階生成用: 全セクションを含む出力をパースする(後方互換のため残す) */
export function parseDelimitedProblem(text: string): RawGeneratedProblem {
  const sections = parseSections(text);
  const samples =
    sections.SAMPLE_INPUT !== undefined || sections.SAMPLE_OUTPUT !== undefined
      ? [{ input: sections.SAMPLE_INPUT ?? "", output: sections.SAMPLE_OUTPUT ?? "" }]
      : [];
  const python = extractCode(sections.PYTHON || "");
  if (!sections.TITLE && !sections.STATEMENT && !python) {
    throw new Error("セクション形式として解釈できませんでした");
  }
  return {
    title: sections.TITLE ?? "",
    statement: sections.STATEMENT ?? "",
    inputFormat: sections.INPUT_FORMAT ?? "",
    outputFormat: sections.OUTPUT_FORMAT ?? "",
    constraints: sectionToList(sections.CONSTRAINTS),
    samples,
    testInputs: splitInputBlocks(sections.TEST_INPUTS),
    referenceSolutions: { python },
    hints: sectionToList(sections.HINTS),
    explanation: sections.EXPLANATION ?? "",
  };
}

/** 問題仕様(コードなし)の型 */
export type ProblemSpec = {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  inputs: string[];
  hints: string[];
  explanation: string;
};

/** 2段階生成の第1段階: 問題仕様(コードなし)をパースする */
export function parseProblemSpec(text: string): ProblemSpec {
  const s = parseSections(text);
  // 入力一覧は [INPUTS] を優先し、無ければ [TEST_INPUTS]/[SAMPLE_INPUT] を使う
  const inputRaw = s.INPUTS ?? s.TEST_INPUTS ?? "";
  const inputs = splitInputBlocks(inputRaw);
  if (s.SAMPLE_INPUT && !inputs.includes(s.SAMPLE_INPUT.trim())) {
    inputs.unshift(s.SAMPLE_INPUT.trim());
  }
  return {
    title: s.TITLE ?? "",
    statement: s.STATEMENT ?? "",
    inputFormat: s.INPUT_FORMAT ?? "",
    outputFormat: s.OUTPUT_FORMAT ?? "",
    constraints: sectionToList(s.CONSTRAINTS),
    inputs,
    hints: sectionToList(s.HINTS),
    explanation: s.EXPLANATION ?? "",
  };
}
