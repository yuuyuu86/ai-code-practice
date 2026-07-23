import type { Language } from "@/types/problem";

export type CompletionSnippet = {
  label: string;
  insertText: string;
  detail: string;
  isSnippet: boolean;
};

/**
 * MVP補完スニペット定義。
 * 新しい言語を追加するときは、ここにエントリを足すだけでよい。
 */
export const COMPLETION_SNIPPETS: Record<Language, CompletionSnippet[]> = {
  c: [
    {
      label: "main",
      insertText: "#include <stdio.h>\n\nint main(void) {\n    ${1}\n    return 0;\n}",
      detail: "main関数のひな形",
      isSnippet: true,
    },
    { label: "printf", insertText: 'printf("${1:%d}\\n", ${2});', detail: "出力", isSnippet: true },
    { label: "scanf", insertText: 'scanf("${1:%d}", &${2});', detail: "入力", isSnippet: true },
    {
      label: "for",
      insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3}\n}",
      detail: "forループ",
      isSnippet: true,
    },
    { label: "if", insertText: "if (${1}) {\n    ${2}\n}", detail: "条件分岐", isSnippet: true },
    { label: "while", insertText: "while (${1}) {\n    ${2}\n}", detail: "whileループ", isSnippet: true },
    { label: "return", insertText: "return ${1:0};", detail: "戻り値", isSnippet: true },
  ],
  python: [
    { label: "print", insertText: "print(${1})", detail: "出力", isSnippet: true },
    { label: "input", insertText: "input()", detail: "1行入力", isSnippet: false },
    { label: "range", insertText: "range(${1:n})", detail: "連番", isSnippet: true },
    { label: "for", insertText: "for ${1:i} in range(${2:n}):\n    ${3}", detail: "forループ", isSnippet: true },
    { label: "if", insertText: "if ${1}:\n    ${2}", detail: "条件分岐", isSnippet: true },
    { label: "def", insertText: "def ${1:func}(${2}):\n    ${3}", detail: "関数定義", isSnippet: true },
  ],
  javascript: [
    { label: "console.log", insertText: "console.log(${1});", detail: "出力", isSnippet: true },
    { label: "const", insertText: "const ${1:name} = ${2};", detail: "定数宣言", isSnippet: true },
    { label: "let", insertText: "let ${1:name} = ${2};", detail: "変数宣言", isSnippet: true },
    { label: "function", insertText: "function ${1:name}(${2}) {\n    ${3}\n}", detail: "関数定義", isSnippet: true },
    {
      label: "for",
      insertText: "for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3}\n}",
      detail: "forループ",
      isSnippet: true,
    },
    { label: "if", insertText: "if (${1}) {\n    ${2}\n}", detail: "条件分岐", isSnippet: true },
  ],
  typescript: [
    { label: "console.log", insertText: "console.log(${1});", detail: "出力", isSnippet: true },
    { label: "const", insertText: "const ${1:name}: ${2:number} = ${3};", detail: "定数宣言(型つき)", isSnippet: true },
    { label: "let", insertText: "let ${1:name}: ${2:number} = ${3};", detail: "変数宣言(型つき)", isSnippet: true },
    {
      label: "function",
      insertText: "function ${1:name}(${2}): ${3:void} {\n    ${4}\n}",
      detail: "関数定義(型つき)",
      isSnippet: true,
    },
    {
      label: "for",
      insertText: "for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3}\n}",
      detail: "forループ",
      isSnippet: true,
    },
    { label: "if", insertText: "if (${1}) {\n    ${2}\n}", detail: "条件分岐", isSnippet: true },
    { label: "readLine", insertText: "readLine()", detail: "1行入力", isSnippet: false },
    {
      label: "interface",
      insertText: "interface ${1:Name} {\n    ${2:field}: ${3:string};\n}",
      detail: "インターフェース定義",
      isSnippet: true,
    },
  ],
  sql: [
    { label: "SELECT", insertText: "SELECT ${1:*} FROM ${2:table}", detail: "取り出す", isSnippet: true },
    { label: "WHERE", insertText: "WHERE ${1:column} = ${2:value}", detail: "条件で絞る", isSnippet: true },
    { label: "ORDER BY", insertText: "ORDER BY ${1:column} ${2:ASC}", detail: "並べ替え(採点に必須)", isSnippet: true },
    { label: "GROUP BY", insertText: "GROUP BY ${1:column}", detail: "グループ化", isSnippet: true },
    { label: "JOIN", insertText: "JOIN ${1:table} ON ${2:a} = ${3:b}", detail: "テーブル結合", isSnippet: true },
    { label: "COUNT", insertText: "COUNT(${1:*})", detail: "件数", isSnippet: true },
    { label: "SUM", insertText: "SUM(${1:column})", detail: "合計", isSnippet: true },
  ],
  html: [
    { label: "h1", insertText: "<h1>${1}</h1>", detail: "大見出し", isSnippet: true },
    { label: "p", insertText: "<p>${1}</p>", detail: "段落", isSnippet: true },
    { label: "ul", insertText: "<ul>\n  <li>${1}</li>\n</ul>", detail: "箇条書き", isSnippet: true },
    { label: "img", insertText: '<img src="${1}" alt="${2}">', detail: "画像", isSnippet: true },
    { label: "a", insertText: '<a href="${1}">${2}</a>', detail: "リンク", isSnippet: true },
    { label: "style", insertText: "<style>\n  ${1}\n</style>", detail: "CSSを書く場所", isSnippet: true },
    { label: "script", insertText: "<script>\n  ${1}\n</script>", detail: "JavaScriptを書く場所", isSnippet: true },
    {
      label: "querySelector",
      insertText: 'document.querySelector("${1}")',
      detail: "要素を取り出す",
      isSnippet: true,
    },
  ],
};
