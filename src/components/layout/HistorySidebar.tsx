"use client";

import type { Submission } from "@/types/submission";
import HistoryList from "@/components/history/HistoryList";

export default function HistorySidebar({
  submissions,
  selectedId,
  onSelect,
}: {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (s: Submission) => void;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm">
      <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">実行履歴</h3>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <HistoryList submissions={submissions} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </aside>
  );
}
