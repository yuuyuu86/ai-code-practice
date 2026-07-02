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
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (s: Submission) => void;
}) {
  if (submissions.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-400">まだ実行履歴がありません。</p>;
  }

  return (
    <ul className="space-y-1.5">
      {submissions.map((s) => (
        <li key={s.id}>
          <button
            onClick={() => onSelect(s)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
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
        </li>
      ))}
    </ul>
  );
}
