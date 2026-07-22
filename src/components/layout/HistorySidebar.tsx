"use client";

/**
 * 実行履歴サイドバーの外枠。
 * 件数表示と「すべて削除」は両モード共通なのでここに置き、
 * 行の中身(リスト)は各モードが children で渡す。
 */
export default function HistorySidebar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-700">
          実行履歴
          {count > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">({count})</span>}
        </h3>
        {count > 0 && (
          <button
            onClick={onClear}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            すべて削除
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </aside>
  );
}
