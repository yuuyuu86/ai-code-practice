import type * as MonacoTypes from "monaco-editor";
import type { LanguageRunner, RunnerResult, RunParams } from "./types";
import { javascriptRunner } from "./javascriptRunner";
import { whenMonacoReady } from "@/lib/editor/monacoRef";
import { configureTypeScript, getMonacoTypeScript } from "@/lib/editor/typescriptSetup";

/**
 * TypeScript Runner。
 *
 * 追加のコンパイラは入れない。Monacoが同梱しているTypeScriptコンパイラ(tsWorker)を借りて
 *   1. 型チェック → エラーがあれば compile-error
 *   2. JavaScriptへ変換 → JavaScript Runner(Web Worker)で実行
 * という流れにする。型エラーが実行前に落ちるので、TypeScriptを学ぶ目的に合う。
 */

/** エディタのモデルが見つからなかったときに使う、一時モデルのURI */
const FALLBACK_MODEL_URI = "ts:///__practice_run__.ts";

type TsDiagnostic = {
  start?: number;
  messageText: string | { messageText: string; next?: unknown };
  code?: number;
};

type TsWorker = {
  getSyntacticDiagnostics: (fileName: string) => Promise<TsDiagnostic[]>;
  getSemanticDiagnostics: (fileName: string) => Promise<TsDiagnostic[]>;
  getEmitOutput: (fileName: string) => Promise<{ outputFiles: Array<{ name: string; text: string }> }>;
};

/** DiagnosticMessageChain(入れ子のメッセージ)を1行に潰す */
function flattenMessage(messageText: TsDiagnostic["messageText"]): string {
  if (typeof messageText === "string") return messageText;
  return messageText.messageText;
}

function formatDiagnostics(
  diagnostics: TsDiagnostic[],
  model: MonacoTypes.editor.ITextModel,
): string {
  return diagnostics
    .map((d) => {
      const where =
        typeof d.start === "number"
          ? (() => {
              const pos = model.getPositionAt(d.start!);
              return `${pos.lineNumber}行目: `;
            })()
          : "";
      return `${where}${flattenMessage(d.messageText)}`;
    })
    .join("\n");
}

/**
 * 型チェックに使うモデルを用意する。
 *
 * まずエディタが持っているモデルをそのまま使う(通常はこちら)。
 * 実行するコードはエディタの中身そのものなので、これでほぼ必ず一致する。
 *
 * 別モデルを新しく作ると、TypeScriptは module:None のファイルを同じグローバルスコープとして
 * 扱うため、エディタ側の `const n` と実行用モデルの `const n` がぶつかって
 * 「Cannot redeclare block-scoped variable」という実在しないエラーが出てしまう。
 * だから新規作成はフォールバックに留め、使い終わったら必ず破棄する。
 */
function acquireModel(
  monaco: typeof MonacoTypes,
  code: string,
): { model: MonacoTypes.editor.ITextModel; release: () => void } {
  const fromEditor = monaco.editor
    .getModels()
    .find((m) => !m.isDisposed() && m.getLanguageId() === "typescript" && m.getValue() === code);
  if (fromEditor) return { model: fromEditor, release: () => {} };

  const uri = monaco.Uri.parse(FALLBACK_MODEL_URI);
  monaco.editor.getModel(uri)?.dispose();
  const model = monaco.editor.createModel(code, "typescript", uri);
  return { model, release: () => model.dispose() };
}

async function compileToJavaScript(
  code: string,
): Promise<{ ok: true; js: string } | { ok: false; message: string }> {
  const monaco = await whenMonacoReady();
  if (!monaco) {
    return { ok: false, message: "TypeScriptコンパイラの準備ができませんでした。ページを再読み込みしてください。" };
  }
  configureTypeScript(monaco);
  const ts = getMonacoTypeScript(monaco);
  if (!ts) {
    return { ok: false, message: "TypeScriptコンパイラの準備ができませんでした。ページを再読み込みしてください。" };
  }

  const { model, release } = acquireModel(monaco, code);
  try {
    const fileName = model.uri.toString();
    const getWorker = await ts.getTypeScriptWorker();
    const worker = (await getWorker(model.uri)) as unknown as TsWorker;

    const [syntactic, semantic] = await Promise.all([
      worker.getSyntacticDiagnostics(fileName),
      worker.getSemanticDiagnostics(fileName),
    ]);
    const errors = [...syntactic, ...semantic];
    if (errors.length > 0) {
      return { ok: false, message: formatDiagnostics(errors, model) };
    }

    const emit = await worker.getEmitOutput(fileName);
    const js = emit.outputFiles.find((f) => f.name.endsWith(".js"))?.text;
    if (js === undefined) {
      return { ok: false, message: "JavaScriptへの変換に失敗しました。" };
    }
    return { ok: true, js };
  } finally {
    release();
  }
}

async function runTypeScript(params: RunParams): Promise<RunnerResult> {
  const started = performance.now();
  const compiled = await compileToJavaScript(params.code);
  if (!compiled.ok) {
    return {
      type: "compile-error",
      stdout: "",
      stderr: compiled.message,
      elapsedMs: performance.now() - started,
    };
  }
  const result = await javascriptRunner.run({ ...params, code: compiled.js });
  // 実行時間はコンパイル込みで返す(体感時間に合わせる)
  return { ...result, elapsedMs: performance.now() - started };
}

export const typescriptRunner: LanguageRunner = {
  language: "typescript",
  isAvailable: async () => typeof Worker !== "undefined",
  run: runTypeScript,
};
