"use client";

import type { Submission } from "@/types/submission";
import HistoryList from "@/components/history/HistoryList";

export default function HistorySidebar({
  submissions,
  selectedId,
  onSelect,
  onDelete,
  onClear,
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (s: Submission) => void;
  onDelete: (s: Submission) => void;
  onClear: () => void;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-700">
          実行履歴
          {submissions.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">({submissions.length})</span>}
        </h3>
        {submissions.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            すべて削除
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <HistoryList submissions={submissions} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} />
      </div>
    </aside>
  );
}
