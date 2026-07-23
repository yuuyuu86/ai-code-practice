import { describe, expect, it } from "vitest";
import {
  checkHtmlCheckList,
  deserializeCheck,
  parseHtmlChecks,
  serializeCheck,
  type HtmlCheck,
} from "./htmlChecks";

const VALID_LINES = [
  "exists|h1|大きな見出し(h1)がある",
  "count|li|3|リスト項目(li)が3つある",
  "style|h1|color|red|見出しの文字色が赤になっている",
].join("\n");

describe("parseHtmlChecks", () => {
  it("種類ごとに項目数を見て読み取る", () => {
    const checks = parseHtmlChecks(
      [
        "exists|h1|見出しがある",
        "count|li|3|リストが3つある",
        "text|h1|こんにちは|見出しの文字が正しい",
        "attr|img|alt|猫|画像に説明がついている",
        "style|h1|color|red|見出しが赤い",
      ].join("\n"),
    );
    expect(checks.map((c) => c.kind)).toEqual(["exists", "count", "text", "attr", "style"]);
    expect(checks[3]).toEqual({ kind: "attr", selector: "img", name: "alt", value: "猫", description: "画像に説明がついている" });
  });

  it("箇条書きの記号や空行があっても読める", () => {
    const checks = parseHtmlChecks(["- exists|h1|見出しがある", "", "  * count|p|2|段落が2つある"].join("\n"));
    expect(checks).toHaveLength(2);
  });

  it("項目数が足りない行は捨てる", () => {
    expect(parseHtmlChecks("exists|h1")).toEqual([]);
    expect(parseHtmlChecks("style|h1|color|説明が足りない")).toEqual([]);
  });

  it("知らない種類は捨てる", () => {
    expect(parseHtmlChecks("screenshot|h1|見た目が同じ")).toEqual([]);
  });
});

describe("serializeCheck / deserializeCheck", () => {
  it("書き出して読み直しても同じになる", () => {
    const checks: HtmlCheck[] = [
      { kind: "exists", selector: "h1", description: "見出しがある" },
      { kind: "count", selector: "li", value: "3", description: "3つある" },
      { kind: "text", selector: "p", value: "やあ", description: "文字が正しい" },
      { kind: "attr", selector: "img", name: "alt", value: "猫", description: "説明がある" },
      { kind: "style", selector: "h1", name: "color", value: "red", description: "赤い" },
    ];
    for (const check of checks) {
      expect(deserializeCheck(serializeCheck(check))).toEqual(check);
    }
  });
});

describe("checkHtmlCheckList", () => {
  it("3個以上そろっていれば通る", () => {
    expect(checkHtmlCheckList(parseHtmlChecks(VALID_LINES))).toEqual({ ok: true });
  });

  it("2個以下は落とす", () => {
    const result = checkHtmlCheckList(parseHtmlChecks("exists|h1|見出しがある\ncount|li|3|3つある"));
    expect(result.ok).toBe(false);
  });

  it("同じチェックの重複は落とす", () => {
    const result = checkHtmlCheckList(
      parseHtmlChecks(["exists|h1|見出しがある", "exists|h1|見出しがある", "count|li|3|3つある"].join("\n")),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("重複");
  });

  it("countの個数が数字でなければ落とす", () => {
    const result = checkHtmlCheckList(
      parseHtmlChecks(["exists|h1|見出しがある", "count|li|さん|3つある", "exists|p|段落がある"].join("\n")),
    );
    expect(result.ok).toBe(false);
  });

  it("説明が短すぎるものは落とす", () => {
    const result = checkHtmlCheckList(
      parseHtmlChecks(["exists|h1|ある", "count|li|3|3つある", "exists|p|段落がある"].join("\n")),
    );
    expect(result.ok).toBe(false);
  });
});
