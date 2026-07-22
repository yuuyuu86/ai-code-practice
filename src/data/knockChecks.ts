/**
 * 出力比較ができない問題の「性質チェック」。
 *
 * 乱数を使う問題や、表示内容が学習者ごとに変わる問題は模範解答と出力を比較できない。
 * そこで「出力が満たすべき性質」を直接検証して合否を出す。
 * ここに定義が無い問題は、通常どおり模範解答との出力比較で判定する。
 */

export type PropertyCheck = {
  /** 学習者に見せる、この問題で確認している内容 */
  description: string;
  /** このチェックを行うときに与える標準入力 */
  inputs: string[];
  /** 満たしていれば null、違反していれば理由を返す */
  validate: (stdout: string) => string | null;
};

/** 空行を除いた行の配列 */
function lines(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

const isInteger = (s: string) => /^-?\d+$/.test(s);

export const KNOCK_PROPERTY_CHECKS: Record<number, PropertyCheck> = {
  2: {
    description: "3行以上が表示されていること(名前・学年・好きなもの)",
    inputs: [""],
    validate: (out) => {
      const ls = lines(out);
      if (ls.length < 3) return `3行以上表示してください(いまは${ls.length}行です)`;
      return null;
    },
  },
  3: {
    description: "3行が表示され、各行がタブで区切られていること",
    inputs: [""],
    validate: (out) => {
      const ls = out.split("\n").filter((l) => l.trim() !== "");
      if (ls.length < 3) return `3行表示してください(いまは${ls.length}行です)`;
      const noTab = ls.slice(0, 3).findIndex((l) => !l.includes("\t"));
      if (noTab >= 0) return `${noTab + 1}行目がタブ(\\t)で区切られていません`;
      return null;
    },
  },
  96: {
    description: "整数が3行表示されていること",
    inputs: [""],
    validate: (out) => {
      const ls = lines(out);
      if (ls.length !== 3) return `3行表示してください(いまは${ls.length}行です)`;
      const bad = ls.findIndex((l) => !isInteger(l));
      if (bad >= 0) return `${bad + 1}行目が整数になっていません: ${ls[bad]}`;
      return null;
    },
  },
  97: {
    description: "1から6までの整数が1つ表示されていること",
    inputs: [""],
    validate: (out) => {
      const ls = lines(out);
      if (ls.length !== 1) return `1行だけ表示してください(いまは${ls.length}行です)`;
      if (!isInteger(ls[0])) return `整数になっていません: ${ls[0]}`;
      const n = Number(ls[0]);
      if (n < 1 || n > 6) return `サイコロの目は1〜6です(いまは${n}です)`;
      return null;
    },
  },
  98: {
    description: "1〜6の目が並び、最後の2回が同じ目で終わっていること",
    inputs: [""],
    validate: (out) => {
      const ls = lines(out).filter(isInteger);
      if (ls.length < 2) return "サイコロの目が2回以上表示されていません";
      const nums = ls.map(Number);
      if (nums.some((n) => n < 1 || n > 6)) return "1〜6以外の目が表示されています";
      if (nums[nums.length - 1] !== nums[nums.length - 2]) {
        return "最後の2回が同じ目になっていません(同じ目が2回続いたら終了する必要があります)";
      }
      // 途中で同じ目が続いていたらそこで終わっているはず
      for (let i = 1; i < nums.length - 1; i++) {
        if (nums[i] === nums[i - 1]) return `${i}回目と${i + 1}回目が同じ目なので、そこで終了する必要があります`;
      }
      return null;
    },
  },
  99: {
    description: "larger / smaller / correct のいずれかが表示され、7回以内であること",
    inputs: ["50 25 75 12 60 40 90"],
    validate: (out) => {
      const ls = lines(out);
      if (ls.length === 0) return "何も表示されていません";
      if (ls.length > 7) return `表示が${ls.length}回あります(最大7回までです)`;
      const allowed = new Set(["larger", "smaller", "correct"]);
      const bad = ls.findIndex((l) => !allowed.has(l));
      if (bad >= 0) return `${bad + 1}行目が larger / smaller / correct のどれでもありません: ${ls[bad]}`;
      const correctAt = ls.indexOf("correct");
      if (correctAt >= 0 && correctAt !== ls.length - 1) return "correct を表示したらそこで終了する必要があります";
      return null;
    },
  },
};

/** 性質チェックで判定する問題か */
export function hasPropertyCheck(no: number): boolean {
  return no in KNOCK_PROPERTY_CHECKS;
}
