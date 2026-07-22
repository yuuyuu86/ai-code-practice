"use client";

import type { Problem } from "@/types/problem";

/**
 * 生成済み問題の一覧。
 * 実行せずに終わった問題は履歴(submissions)に残らないため、
 * この一覧から選び直せるようにする。
 */
export default function GeneratedProblemList({
  problems,
  selectedId,
  onSelect,
  onDelete,
}: {
  problems: Problem[];
  selectedId: string | null;
  onSelect: (p: Problem) => void;
  onDelete: (p: Problem) => void;
}) {
  if (problems.length === 0) return null;

  return (
    <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
        生成した問題({problems.length})
      </h3>
      <ul className="max-h-40 overflow-y-auto p-1.5">
        {problems.map((p) => (
          <li key={p.id} className="group relative">
            <button
              onClick={() => onSelect(p)}
              className={`w-full rounded-lg px-2 py-1.5 pr-7 text-left transition ${
                selectedId === p.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block truncate text-xs">{p.title}</span>
              <span className="text-[10px] text-slate-400">
                {p.difficulty} / {p.topic}
              </span>
            </button>
            <button
              onClick={() => onDelete(p)}
              aria-label="この問題を削除"
              title="この問題を削除"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-sm leading-none text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
