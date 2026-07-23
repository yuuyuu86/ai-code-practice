import type { Source } from "@/types/problem";

export type ReadResult = { ok: true; title: string; type: Source["type"]; text: string } | { ok: false; reason: string };

/** 取り込めるファイルの上限。教材1本としては十分で、IndexedDBを圧迫しない大きさ。 */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".txt", ".md", ".markdown", ".pdf"] as const;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function baseNameOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
}

/**
 * 教材ファイルを読んでプレーンテキストにする。
 * PDFはpdf.jsで本文だけ抜き出す(レイアウトや画像は捨てる)。
 */
export async function readSourceFile(file: File): Promise<ReadResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `ファイルが大きすぎます(上限${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)。` };
  }

  const ext = extensionOf(file.name);
  const title = baseNameOf(file.name);

  if (ext === ".pdf") {
    try {
      const text = await extractPdfText(file);
      if (text.trim() === "") {
        return {
          ok: false,
          reason: "このPDFからは文字を取り出せませんでした。スキャン画像のPDFは対象外です。テキストを貼り付けて登録してください。",
        };
      }
      return { ok: true, title, type: "pdf", text };
    } catch (err) {
      console.warn("[readSourceFile] PDF読み込みエラー:", err);
      return { ok: false, reason: "PDFを読み込めませんでした。テキストを貼り付けて登録してください。" };
    }
  }

  if (ext === ".txt" || ext === ".md" || ext === ".markdown") {
    const text = await file.text();
    return { ok: true, title, type: ext === ".txt" ? "text" : "markdown", text };
  }

  return { ok: false, reason: `対応していない形式です(${ACCEPTED_EXTENSIONS.join(" / ")})。` };
}

/**
 * PDFから本文テキストを取り出す。
 * pdf.jsは重いので、PDFを選んだときだけ動的importで読み込む。
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // ワーカーは同一オリジンから読ませる(静的書き出し + COEPでもCDNに頼らないため)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const content = await page.getTextContent();
      // pdf.jsは文字の断片を返すので、改行フラグ(hasEOL)を見て行に組み直す
      const text = content.items
        .map((item) => (("str" in item ? item.str : "") + (("hasEOL" in item && item.hasEOL) ? "\n" : "")))
        .join("")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      page.cleanup();
      if (text !== "") pages.push(text);
    }
    return pages.join("\n\n");
  } finally {
    // ワーカーごと後片付けする。documentではなくloadingTask側が破棄の窓口。
    await task.destroy();
  }
}
