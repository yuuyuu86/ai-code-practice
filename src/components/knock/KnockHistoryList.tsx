"use client";

import type { KnockSubmission } from "@/types/submission";
import type { RunnerResultType } from "@/lib/runners/types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 合否ではないので「実行できたか」だけを2トーンで示す。
const RUN_BADGE: Record<RunnerResultType, { label: string; style: string }> = {
  success: { label: "実行", style: "bg-green-100 text-green-700 border-green-300" },
  "compile-error": { label: "CE", style: "bg-amber-50 text-amber-700 border-amber-200" },
  "runtime-error": { label: "RE", style: "bg-amber-50 text-amber-700 border-amber-200" },
  timeout: { label: "TLE", style: "bg-amber-50 text-amber-700 border-amber-200" },
  "output-limit": { label: "OLE", style: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function KnockHistoryList({
  submissions,
  selectedId,
  onSelect,
  onDelete,
}: {
  submissions: KnockSubmission[];
  selectedId: string | null;
  onSelect: (s: KnockSubmission) => void;
  onDelete: (s: KnockSubmission) => void;
}) {
  if (submissions.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-400">まだ実行履歴がありません。</p>;
  }

  return (
    <ul className="space-y-1.5">
      {submissions.map((s) => {
        const badge = RUN_BADGE[s.runType];
        return (
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
                <span className="font-mono text-[10px] text-slate-500">
                  No.{String(s.knockNo).padStart(2, "0")}
                </span>
                <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${badge.style}`}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-600">{s.knockTitle}</p>
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
        );
      })}
    </ul>
  );
}
