import { describe, expect, it } from "vitest";
import { COMING_SOON_LANGUAGES, LANGUAGES, getLanguageConfig } from "./languages";
import { COMPLETION_SNIPPETS } from "./editor/completions";
import type { Language } from "@/types/problem";

/**
 * 言語を1つ足すときに忘れやすい配線を守るためのテスト。
 * (LANGUAGES / 補完スニペット / 準備中リストの3か所がズレやすい)
 * Runnerの登録はブラウザ専用モジュールを読み込むのでここでは確認しない。
 */
describe("言語設定", () => {
  it("全ての言語に補完スニペットがある", () => {
    for (const lang of LANGUAGES) {
      expect(COMPLETION_SNIPPETS[lang.id], `${lang.id}の補完スニペットがありません`).toBeDefined();
      expect(COMPLETION_SNIPPETS[lang.id].length).toBeGreaterThan(0);
    }
  });

  it("利用可能な言語が「準備中」にも並んでいない", () => {
    const availableLabels = LANGUAGES.filter((l) => l.available).map((l) => l.label);
    for (const label of availableLabels) {
      expect(COMING_SOON_LANGUAGES, `${label}が準備中リストに残っています`).not.toContain(label);
    }
  });

  it("idとファイル名が重複していない", () => {
    expect(new Set(LANGUAGES.map((l) => l.id)).size).toBe(LANGUAGES.length);
    expect(new Set(LANGUAGES.map((l) => l.fileName)).size).toBe(LANGUAGES.length);
  });

  it("getLanguageConfigが全ての言語を引ける", () => {
    for (const lang of LANGUAGES) {
      expect(getLanguageConfig(lang.id as Language).id).toBe(lang.id);
    }
  });

  it("TypeScriptが利用可能で、拡張子が.tsになっている", () => {
    const ts = LANGUAGES.find((l) => l.id === "typescript");
    expect(ts).toBeDefined();
    expect(ts!.available).toBe(true);
    expect(ts!.fileName).toBe("main.ts");
    expect(ts!.monacoLanguage).toBe("typescript");
  });
});
