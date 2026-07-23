import type * as MonacoTypes from "monaco-editor";

/** monaco-editor の TypeScript 名前空間(setCompilerOptions / getTypeScriptWorker などを持つ) */
export type MonacoTypeScript = typeof MonacoTypes.typescript;

/**
 * TypeScript名前空間を取り出す。
 * monaco-editor 0.55 で `monaco.languages.typescript` は非推奨になり、
 * トップレベルの `monaco.typescript` に移った。まだ移行途中のビルドもあり得るので、
 * 新しい場所を優先しつつ旧い場所にもフォールバックする。
 */
export function getMonacoTypeScript(monaco: typeof MonacoTypes): MonacoTypeScript | null {
  const modern = (monaco as { typescript?: MonacoTypeScript }).typescript;
  if (modern?.typescriptDefaults) return modern;
  const legacy = (monaco.languages as unknown as { typescript?: MonacoTypeScript }).typescript;
  if (legacy?.typescriptDefaults) return legacy;
  return null;
}

/**
 * TypeScriptの実行環境に合わせてMonacoのTypeScriptコンパイラを設定する。
 *
 * - 1ファイルのスクリプトとして扱う(module: None)。importは使わない前提。
 * - 標準入出力は JavaScript Runner と同じ `input` / `readLine()` / `console.log` で渡すので、
 *   その分の型宣言を extraLib として足しておく。これが無いと
 *   「名前 'readLine' が見つかりません」という型エラーになってしまう。
 *
 * エディタ表示(赤波線)と実行時の型チェックの両方が、この同じ設定を使う。
 */
export const TS_GLOBALS_DTS = `
/** 標準入力の全文(改行を含む) */
declare const input: string;
/** 標準入力を1行読み取る。最終行より後は空文字列を返す。 */
declare function readLine(): string;
`;

let configured = false;

export function configureTypeScript(monaco: typeof MonacoTypes): void {
  if (configured) return;
  const ts = getMonacoTypeScript(monaco);
  if (!ts) return;
  configured = true;

  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    lib: ["es2020", "dom"],
    module: ts.ModuleKind.None,
    strict: true,
    noEmitOnError: false,
    allowNonTsExtensions: true,
  });
  ts.typescriptDefaults.addExtraLib(TS_GLOBALS_DTS, "ts:practice-globals.d.ts");
}
