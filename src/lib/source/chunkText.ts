import { TOPICS } from "@/lib/languages";

/** 1チャンクの目安の長さ(文字)。小型モデルの文脈長に収まる大きさにする。 */
export const CHUNK_TARGET_CHARS = 700;
/** これより短い断片は前のチャンクにくっつける */
const MIN_CHUNK_CHARS = 120;

export type RawChunk = {
  /** 見出しが取れたら入れる(検索結果の表示に使う) */
  title?: string;
  text: string;
  topics: string[];
};

/**
 * 単元の判定に使うキーワード。
 * 教材の言い回しは揺れるので、完全一致ではなく含まれるかどうかで見る。
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  入出力: ["入力", "出力", "printf", "scanf", "print", "console.log", "標準入力", "標準出力", "表示"],
  "変数・計算": ["変数", "代入", "演算", "計算", "四則", "int ", "float", "double", "型", "剰余"],
  条件分岐: ["条件", "分岐", "if", "else", "switch", "真偽", "比較演算"],
  繰り返し: ["繰り返し", "ループ", "for", "while", "do-while", "反復"],
  配列: ["配列", "array", "添字", "要素数", "2次元", "二次元", "リスト"],
  関数: ["関数", "function", "引数", "戻り値", "返り値", "def ", "return"],
};

/** 本文から該当しそうな単元を推定する。1つも当たらなければ空配列。 */
export function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  return TOPICS.filter((topic) =>
    (TOPIC_KEYWORDS[topic] ?? []).some((kw) => lower.includes(kw.toLowerCase())),
  );
}

/** Markdownの見出し行なら見出し文字列を返す */
function headingOf(line: string): string | null {
  const md = /^\s{0,3}#{1,6}\s+(.*\S)\s*$/.exec(line);
  if (md) return md[1];
  // 「第3章 繰り返し」「3. 繰り返し」のような日本語教材の見出しも拾う
  const jp = /^\s*(第\s*\d+\s*[章節]|\d+\s*[.．、])\s*(.+\S)\s*$/.exec(line);
  if (jp) return `${jp[1]} ${jp[2]}`.trim();
  return null;
}

/**
 * 教材のテキストをチャンクに割る。
 *
 * 見出しがあればそこで区切り、無ければ空行で区切る。
 * 区切った結果が長すぎる場合はCHUNK_TARGET_CHARSごとにさらに割る。
 * 短すぎる断片は直前のチャンクに足して、意味の無い細切れを作らない。
 */
export function chunkText(source: string): RawChunk[] {
  const normalized = source.replace(/\r\n?/g, "\n").trim();
  if (normalized === "") return [];

  // 1. 見出しごとのセクションに分ける
  const sections: Array<{ title?: string; lines: string[] }> = [];
  let current: { title?: string; lines: string[] } = { lines: [] };
  for (const line of normalized.split("\n")) {
    const heading = headingOf(line);
    if (heading !== null) {
      if (current.lines.join("").trim() !== "" || current.title) sections.push(current);
      current = { title: heading, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  // 2. セクション内を段落(空行区切り)に分け、目安の長さにまとめ直す
  const chunks: RawChunk[] = [];
  for (const section of sections) {
    const body = section.lines.join("\n").trim();
    if (body === "" && !section.title) continue;

    const paragraphs = body.split(/\n{2,}/).flatMap(splitLongParagraph);
    let buffer = "";
    const flush = () => {
      const text = buffer.trim();
      buffer = "";
      if (text === "") return;
      const full = section.title ? `${section.title}\n${text}` : text;
      chunks.push({ title: section.title, text: full, topics: detectTopics(full) });
    };

    for (const paragraph of paragraphs) {
      if (buffer !== "" && buffer.length + paragraph.length > CHUNK_TARGET_CHARS) flush();
      buffer = buffer === "" ? paragraph : `${buffer}\n\n${paragraph}`;
    }
    flush();

    // 見出しだけで本文が無いセクションは捨てる(目次など)
  }

  // 3. 短すぎるチャンクを前にくっつける
  const merged: RawChunk[] = [];
  for (const chunk of chunks) {
    const prev = merged[merged.length - 1];
    if (prev && chunk.text.length < MIN_CHUNK_CHARS && prev.text.length + chunk.text.length <= CHUNK_TARGET_CHARS * 1.5) {
      prev.text = `${prev.text}\n\n${chunk.text}`;
      prev.topics = detectTopics(prev.text);
      continue;
    }
    merged.push(chunk);
  }
  return merged;
}

/** CHUNK_TARGET_CHARSを大きく超える段落を、文の切れ目で割る */
function splitLongParagraph(paragraph: string): string[] {
  if (paragraph.length <= CHUNK_TARGET_CHARS) return [paragraph];
  const sentences = paragraph.split(/(?<=[。.!?！？\n])/);
  const out: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if (buffer !== "" && buffer.length + sentence.length > CHUNK_TARGET_CHARS) {
      out.push(buffer);
      buffer = "";
    }
    buffer += sentence;
    // 1文だけでめちゃくちゃ長い場合(改行の無いテキスト)は強制的に切る
    while (buffer.length > CHUNK_TARGET_CHARS * 1.5) {
      out.push(buffer.slice(0, CHUNK_TARGET_CHARS));
      buffer = buffer.slice(CHUNK_TARGET_CHARS);
    }
  }
  if (buffer.trim() !== "") out.push(buffer);
  return out;
}
