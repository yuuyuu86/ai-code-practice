import type * as MonacoTypes from "monaco-editor";

/**
 * 読み込み済みのMonacoインスタンスへの参照。
 *
 * TypeScript Runnerは、Monacoが同梱しているTypeScriptコンパイラ(tsWorker)を
 * そのまま借りて型チェックとJSへの変換を行う。そのため実行時にMonacoが必要になるが、
 * Runnerはエディタコンポーネントに依存させたくない。
 * そこでCodeEditorがマウント時にここへ登録し、Runnerはここから受け取る。
 */
let monacoRef: typeof MonacoTypes | null = null;
const waiters: Array<(m: typeof MonacoTypes) => void> = [];

export function setMonaco(monaco: typeof MonacoTypes): void {
  if (monacoRef) return;
  monacoRef = monaco;
  while (waiters.length > 0) waiters.shift()!(monaco);
}

export function getMonaco(): typeof MonacoTypes | null {
  return monacoRef;
}

/**
 * Monacoが読み込まれるまで待つ。timeoutMsを過ぎたらnullを返す。
 * (エディタは画面に出ているので通常すぐ解決するが、初回ロード中は数百ms待つことがある)
 */
export function whenMonacoReady(timeoutMs = 15_000): Promise<typeof MonacoTypes | null> {
  if (monacoRef) return Promise.resolve(monacoRef);
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, timeoutMs);
    waiters.push((m) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(m);
    });
  });
}
