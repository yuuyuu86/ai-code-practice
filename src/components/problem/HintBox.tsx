"use client";

import { useState } from "react";
import { LuLightbulb } from "react-icons/lu";

/**
 * 3段階ヒント。いきなり答えを見せず、1つずつ開く。
 */
export default function HintBox({ hints }: { hints: string[] }) {
  const [revealed, setRevealed] = useState(0);

  if (hints.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
      <h4 className="flex items-center gap-1 text-xs font-bold text-slate-500">
        <LuLightbulb className="h-3.5 w-3.5 text-amber-400" />
        ヒント
      </h4>
      {hints.slice(0, revealed).map((hint, i) => (
        <div key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <span className="font-bold">ヒント{i + 1}: </span>
          {hint}
        </div>
      ))}
      {revealed < hints.length && (
        <button
          onClick={() => setRevealed((n) => n + 1)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
        >
          <LuLightbulb className="h-3.5 w-3.5" />
          ヒント{revealed + 1}を見る({revealed + 1}/{hints.length})
        </button>
      )}
    </div>
  );
}
