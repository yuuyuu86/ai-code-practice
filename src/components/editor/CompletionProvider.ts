import type * as MonacoTypes from "monaco-editor";
import { COMPLETION_SNIPPETS } from "@/lib/editor/completions";
import type { Language } from "@/types/problem";
import { LANGUAGES } from "@/lib/languages";

let registered = false;

/**
 * MonacoのCompletion Providerを登録する。
 * スニペット定義は lib/editor/completions.ts にあり、言語追加時はそちらに足す。
 */
export function registerCompletions(monaco: typeof MonacoTypes): void {
  if (registered) return;
  registered = true;

  for (const lang of LANGUAGES) {
    const snippets = COMPLETION_SNIPPETS[lang.id as Language];
    if (!snippets) continue;

    monaco.languages.registerCompletionItemProvider(lang.monacoLanguage, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: snippets.map((s) => ({
            label: s.label,
            kind: s.isSnippet
              ? monaco.languages.CompletionItemKind.Snippet
              : monaco.languages.CompletionItemKind.Function,
            insertText: s.insertText,
            insertTextRules: s.isSnippet
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            detail: s.detail,
            range,
          })),
        };
      },
    });
  }
}
