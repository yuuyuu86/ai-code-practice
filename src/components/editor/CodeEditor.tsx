"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import type { Language } from "@/types/problem";
import { getLanguageConfig } from "@/lib/languages";
import { registerCompletions } from "./CompletionProvider";
import type * as MonacoTypes from "monaco-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">エディタを読み込み中…</div>
  ),
});

type Props = {
  language: Language;
  value: string;
  onChange: (code: string) => void;
};

export default function CodeEditor({ language, value, onChange }: Props) {
  const config = getLanguageConfig(language);
  const registeredRef = useRef(false);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
        <span className="font-mono text-xs font-medium text-slate-600">{config.fileName}</span>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          language={config.monacoLanguage}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          theme="vs"
          beforeMount={(monaco: typeof MonacoTypes) => {
            if (!registeredRef.current) {
              registerCompletions(monaco);
              registeredRef.current = true;
            }
          }}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12 },
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
