"use client";

export type AppMode = "ai" | "knock";

const TABS: Array<{ mode: AppMode; label: string }> = [
  { mode: "ai", label: "AI生成" },
  { mode: "knock", label: "教材(100本ノック)" },
];

export default function ModeTabs({ mode, onChange }: { mode: AppMode; onChange: (m: AppMode) => void }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {TABS.map((t) => (
        <button
          key={t.mode}
          onClick={() => onChange(t.mode)}
          aria-pressed={mode === t.mode}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
            mode === t.mode ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
