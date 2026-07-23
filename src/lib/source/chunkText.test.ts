import { describe, expect, it } from "vitest";
import { CHUNK_TARGET_CHARS, chunkText, detectTopics } from "./chunkText";

describe("detectTopics", () => {
  it("本文のキーワードから単元を推定する", () => {
    expect(detectTopics("for文で繰り返し処理を書きます")).toContain("繰り返し");
    expect(detectTopics("printfで出力し、scanfで入力を受け取ります")).toContain("入出力");
    expect(detectTopics("配列の要素数を数えます")).toContain("配列");
  });

  it("大文字小文字を区別しない", () => {
    expect(detectTopics("FOR loop")).toContain("繰り返し");
  });

  it("当てはまらなければ空", () => {
    expect(detectTopics("きょうはいい天気ですね")).toEqual([]);
  });
});

describe("chunkText", () => {
  it("空文字は0件", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("Markdownの見出しで区切り、見出しを本文の先頭に残す", () => {
    const chunks = chunkText(
      ["# 繰り返し", "for文の説明です。".repeat(20), "", "## 配列", "配列の説明です。".repeat(20)].join("\n"),
    );
    expect(chunks.length).toBe(2);
    expect(chunks[0].title).toBe("繰り返し");
    expect(chunks[0].text.startsWith("繰り返し\n")).toBe(true);
    expect(chunks[1].title).toBe("配列");
  });

  it("日本語教材の「第N章」見出しも拾う", () => {
    const chunks = chunkText(["第3章 繰り返し", "while文を使います。".repeat(20)].join("\n"));
    expect(chunks[0].title).toBe("第3章 繰り返し");
  });

  it("長い段落を目安の長さで割る", () => {
    const chunks = chunkText("あ".repeat(CHUNK_TARGET_CHARS * 4));
    expect(chunks.length).toBeGreaterThan(1);
    // 上限を大きく超えるチャンクが残っていないこと
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_TARGET_CHARS * 1.6);
    }
  });

  it("短すぎる断片は前のチャンクにまとめる", () => {
    const chunks = chunkText(["本文です。".repeat(60), "", "ひとこと"].join("\n"));
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toContain("ひとこと");
  });

  it("見出しだけで本文が無いセクション(目次)は落とす", () => {
    const chunks = chunkText(["# もくじ", "# 第1章", "# 第2章"].join("\n"));
    expect(chunks).toEqual([]);
  });

  it("各チャンクに単元タグがつく", () => {
    const chunks = chunkText(["# 繰り返し", "for文で繰り返します。".repeat(20)].join("\n"));
    expect(chunks[0].topics).toContain("繰り返し");
  });

  it("CRLFの教材でも見出しを認識する", () => {
    const chunks = chunkText("# 配列\r\n配列の説明です。".repeat(1) + "配列の説明です。".repeat(20));
    expect(chunks[0].title).toBe("配列");
  });
});
