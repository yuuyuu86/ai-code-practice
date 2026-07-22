import { describe, expect, it } from "vitest";
import { KNOCK_GROUPS, KNOCK_PROBLEMS, getKnockProblem, getKnockProblemsByGroup, pickRandomKnock } from "./knock100";
import { KNOCK_TEST_INPUTS } from "./knockTests";
import { KNOCK_PROPERTY_CHECKS } from "./knockChecks";
import { KNOCK_OUTPUT_SPECS } from "./knockOutputSpecs";

/**
 * 教材データの整合性。
 * 「どの問題も採点方法がちょうど1つ決まっている」ことを保証するのが主目的。
 * ここが崩れると、採点されない問題や二重定義が静かに混ざる。
 */
describe("100本ノックのデータ", () => {
  it("100問あり、番号が0〜99で重複しない", () => {
    expect(KNOCK_PROBLEMS).toHaveLength(100);
    expect(KNOCK_PROBLEMS.map((p) => p.no)).toEqual([...Array(100).keys()]);
  });

  it("全問にタイトル・問題文・模範解答がある", () => {
    for (const p of KNOCK_PROBLEMS) {
      expect(p.title.trim(), `No.${p.noText} title`).not.toBe("");
      expect(p.statement.trim(), `No.${p.noText} statement`).not.toBe("");
      expect(p.solution.trim(), `No.${p.noText} solution`).not.toBe("");
    }
  });

  it("単元の内訳が元教材どおり", () => {
    const counts = Object.fromEntries(KNOCK_GROUPS.map((g) => [g.group, getKnockProblemsByGroup(g.group).length]));
    expect(counts).toEqual({
      超基礎: 20,
      条件分岐: 10,
      繰り返し: 30,
      配列: 10,
      文字列: 8,
      関数: 11,
      switch: 7,
      ゲーム: 4,
    });
  });

  it("noTextは2桁ゼロ埋め", () => {
    for (const p of KNOCK_PROBLEMS) expect(p.noText).toBe(String(p.no).padStart(2, "0"));
  });
});

describe("採点データ", () => {
  /** 出力比較でも性質チェックでもない = 自動採点できない問題 */
  const UNJUDGEABLE = [39];

  it("全問がちょうど1つの採点方法を持つ", () => {
    for (const p of KNOCK_PROBLEMS) {
      const byOutput = p.no in KNOCK_TEST_INPUTS;
      const byProperty = p.no in KNOCK_PROPERTY_CHECKS;
      const unjudgeable = UNJUDGEABLE.includes(p.no);
      const ways = [byOutput, byProperty, unjudgeable].filter(Boolean).length;
      expect(ways, `No.${p.noText} の採点方法が${ways}個`).toBe(1);
    }
  });

  it("自動採点できないのは1問だけ", () => {
    expect(UNJUDGEABLE).toHaveLength(1);
  });

  it("テスト入力は各問1件以上ある", () => {
    for (const [no, inputs] of Object.entries(KNOCK_TEST_INPUTS)) {
      expect(inputs.length, `No.${no}`).toBeGreaterThan(0);
    }
  });

  it("答えのベタ書きを弾くため、入力が要る問題は2件以上のケースを持つ", () => {
    for (const [no, inputs] of Object.entries(KNOCK_TEST_INPUTS)) {
      const needsInput = inputs.some((i) => i !== "");
      if (needsInput) expect(inputs.length, `No.${no} は入力ありなので複数ケース必要`).toBeGreaterThan(1);
    }
  });

  it("入力不要の問題は空文字1件だけ(同じ実行を繰り返しても意味がないため)", () => {
    for (const [no, inputs] of Object.entries(KNOCK_TEST_INPUTS)) {
      if (inputs.every((i) => i === "")) expect(inputs, `No.${no}`).toEqual([""]);
    }
  });

  it("出力形式の補足は実在する問題番号に対して定義されている", () => {
    for (const no of Object.keys(KNOCK_OUTPUT_SPECS)) {
      expect(getKnockProblem(Number(no)), `No.${no}`).toBeDefined();
    }
  });
});

describe("問題の取得", () => {
  it("getKnockProblemは番号で引ける", () => {
    expect(getKnockProblem(0)?.title).toBe("Hello");
    expect(getKnockProblem(100)).toBeUndefined();
  });

  it("pickRandomKnockは指定した単元から選ぶ", () => {
    for (let i = 0; i < 30; i++) {
      expect(pickRandomKnock("条件分岐").group).toBe("条件分岐");
    }
  });

  it("pickRandomKnockは単元未指定なら全体から選ぶ", () => {
    expect(KNOCK_PROBLEMS).toContain(pickRandomKnock());
  });
});
