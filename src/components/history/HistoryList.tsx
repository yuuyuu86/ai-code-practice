"use client";

import type { Submission } from "@/types/submission";
import StatusBadge from "@/components/result/StatusBadge";
import { getLanguageConfig } from "@/lib/languages";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function HistoryList({
  submissions,
  selectedId,
  onSelect,
  onDelete,
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (s: Submission) => void;
  onDelete: (s: Submission) => void;
}) {
  if (submissions.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-400">まだ実行履歴がありません。</p>;
  }

  return (
    <ul className="space-y-1.5">
      {submissions.map((s) => (
        <li key={s.id} className="group relative">
          <button
            onClick={() => onSelect(s)}
            className={`w-full rounded-xl border px-3 py-2 pr-8 text-left transition ${
              selectedId === s.id
                ? "border-blue-300 bg-blue-50"
                : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-400">{formatTime(s.createdAt)}</span>
              <span className="text-[10px] font-medium text-slate-500">{getLanguageConfig(s.language).label}</span>
              <StatusBadge status={s.status} size="sm" />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-600">{s.problemTitle}</p>
          </button>
          <button
            onClick={() => onDelete(s)}
            aria-label="この履歴を削除"
            title="この履歴を削除"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-sm leading-none text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
