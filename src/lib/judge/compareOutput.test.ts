import { describe, expect, it } from "vitest";
import { compareOutput, normalizeOutput } from "./compareOutput";

describe("normalizeOutput", () => {
  it("行末の空白とタブを落とす", () => {
    expect(normalizeOutput("abc  \ndef\t\n")).toBe("abc\ndef");
  });

  it("末尾の空行をまとめて落とす", () => {
    expect(normalizeOutput("abc\n\n\n")).toBe("abc");
  });

  it("CRLFをLFに揃える", () => {
    expect(normalizeOutput("a\r\nb")).toBe("a\nb");
  });

  it("行の途中の空白は保持する(タブ区切りの出力を壊さないため)", () => {
    expect(normalizeOutput("a\tb\nc  d")).toBe("a\tb\nc  d");
  });
});

describe("compareOutput", () => {
  it("末尾の改行の有無を無視して一致とみなす", () => {
    expect(compareOutput("8\n", "8")).toBe(true);
  });

  it("値が違えば不一致", () => {
    expect(compareOutput("8\n", "9\n")).toBe(false);
  });

  it("行数が違えば不一致", () => {
    expect(compareOutput("1\n2\n", "1\n")).toBe(false);
  });

  it("行の順番が違えば不一致", () => {
    expect(compareOutput("1\n2\n", "2\n1\n")).toBe(false);
  });

  it("空同士は一致(出力しないのが正解の問題があるため)", () => {
    expect(compareOutput("", "")).toBe(true);
  });

  it("片方だけ空なら不一致", () => {
    expect(compareOutput("", "zero\n")).toBe(false);
  });
});
