"use client";

import type { Difficulty, Language } from "@/types/problem";
import { COMING_SOON_LANGUAGES, DIFFICULTIES, LANGUAGES, topicsFor } from "@/lib/languages";

type Props = {
  language: Language;
  difficulty: Difficulty;
  topic: string;
  generating: boolean;
  onLanguageChange: (l: Language) => void;
  onDifficultyChange: (d: Difficulty) => void;
  onTopicChange: (t: string) => void;
  onGenerate: () => void;
};

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none";

export default function ProblemControls(props: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-2.5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">言語</span>
          <select
            className={selectClass}
            value={props.language}
            onChange={(e) => props.onLanguageChange(e.target.value as Language)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
            {COMING_SOON_LANGUAGES.map((name) => (
              <option key={name} disabled>
                {name}(準備中)
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">難易度</span>
            <select
              className={selectClass}
              value={props.difficulty}
              onChange={(e) => props.onDifficultyChange(e.target.value as Difficulty)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">単元</span>
            <select className={selectClass} value={props.topic} onChange={(e) => props.onTopicChange(e.target.value)}>
              {topicsFor(props.language).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={props.onGenerate}
          disabled={props.generating}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {props.generating && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
          )}
          {props.generating ? "生成中…" : "問題を生成"}
        </button>
      </div>
    </div>
  );
}
