import { describe, expect, it } from "vitest";
import { KNOCK_PROPERTY_CHECKS } from "./knockChecks";

/** 出力比較できない問題を、出力の性質で判定できているかを確かめる */
describe("性質チェック", () => {
  describe("No.97 サイコロ", () => {
    const { validate } = KNOCK_PROPERTY_CHECKS[97];

    it("1〜6なら合格", () => {
      for (const n of [1, 2, 3, 4, 5, 6]) expect(validate(`${n}\n`)).toBeNull();
    });

    it("範囲外は不合格", () => {
      expect(validate("7\n")).toContain("1〜6");
      expect(validate("0\n")).toContain("1〜6");
    });

    it("整数以外は不合格", () => {
      expect(validate("abc\n")).toContain("整数");
    });

    it("何も出力しなければ不合格(空のプログラムを通さない)", () => {
      expect(validate("")).not.toBeNull();
    });

    it("2行以上は不合格", () => {
      expect(validate("1\n2\n")).not.toBeNull();
    });
  });

  describe("No.98 連続サイコロ", () => {
    const { validate } = KNOCK_PROPERTY_CHECKS[98];

    it("最後の2回が同じ目なら合格", () => {
      expect(validate("3\n5\n2\n2\n")).toBeNull();
    });

    it("最後が揃っていなければ不合格", () => {
      expect(validate("3\n5\n2\n")).toContain("最後の2回");
    });

    it("途中で同じ目が続いていたら不合格(そこで終了すべき)", () => {
      expect(validate("4\n4\n1\n1\n")).toContain("終了");
    });

    it("1〜6以外が混ざれば不合格", () => {
      expect(validate("9\n9\n")).toContain("1〜6以外");
    });
  });

  describe("No.99 数当てゲーム", () => {
    const { validate } = KNOCK_PROPERTY_CHECKS[99];

    it("correctで終わっていれば合格", () => {
      expect(validate("larger\nsmaller\ncorrect\n")).toBeNull();
    });

    it("correctの後に出力が続けば不合格", () => {
      expect(validate("correct\nlarger\n")).toContain("終了");
    });

    it("決められた語以外は不合格", () => {
      expect(validate("あたり\n")).toContain("larger");
    });

    it("7回を超えたら不合格", () => {
      expect(validate(Array(8).fill("larger").join("\n"))).toContain("7回");
    });
  });

  describe("No.3 タブ区切り", () => {
    const { validate } = KNOCK_PROPERTY_CHECKS[3];

    it("3行ともタブを含めば合格", () => {
      expect(validate("a\t1\nb\t2\nc\t3\n")).toBeNull();
    });

    it("タブが無い行があれば不合格", () => {
      expect(validate("a\t1\nb 2\nc\t3\n")).toContain("タブ");
    });

    it("3行未満は不合格", () => {
      expect(validate("a\t1\n")).toContain("3行");
    });
  });

  it("すべての性質チェックに入力と説明が定義されている", () => {
    for (const [no, check] of Object.entries(KNOCK_PROPERTY_CHECKS)) {
      expect(check.inputs.length, `No.${no} の入力`).toBeGreaterThan(0);
      expect(check.description.trim(), `No.${no} の説明`).not.toBe("");
    }
  });
});
