import type { Difficulty, Language } from "@/types/problem";

/**
 * 言語設定。新しい言語を追加するときは、ここ + Runner + 補完スニペットを足す。
 */
export type LanguageConfig = {
  id: Language;
  label: string;
  monacoLanguage: string;
  fileName: string;
  template: string;
  available: boolean;
};

export const LANGUAGES: LanguageConfig[] = [
  {
    id: "c",
    label: "C",
    monacoLanguage: "c",
    fileName: "Main.c",
    template: '#include <stdio.h>\n\nint main(void) {\n    // ここにコードを書きましょう\n    return 0;\n}\n',
    available: true,
  },
  {
    id: "python",
    label: "Python",
    monacoLanguage: "python",
    fileName: "main.py",
    template: "# ここにコードを書きましょう\n",
    available: true,
  },
  {
    id: "javascript",
    label: "JavaScript",
    monacoLanguage: "javascript",
    fileName: "main.js",
    template: "// ここにコードを書きましょう\n// 標準入力は input(文字列) または readLine() で受け取れます\n",
    available: true,
  },
  {
    id: "typescript",
    label: "TypeScript",
    monacoLanguage: "typescript",
    fileName: "main.ts",
    template:
      "// ここにコードを書きましょう\n// 標準入力は input: string または readLine(): string で受け取れます\n// 実行前に型チェックが走ります\n",
    available: true,
  },
];

/** 準備中の言語(表示のみ) */
export const COMING_SOON_LANGUAGES = ["SQL", "HTML/CSS/JS"];

export const DIFFICULTIES: Difficulty[] = ["入門", "初級", "中級", "上級"];

export const TOPICS = ["入出力", "変数・計算", "条件分岐", "繰り返し", "配列", "関数"];

export function getLanguageConfig(id: Language): LanguageConfig {
  return LANGUAGES.find((l) => l.id === id)!;
}
