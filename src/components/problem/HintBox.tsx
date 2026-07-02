"use client";

import { useState } from "react";

/**
 * 3段階ヒント。いきなり答えを見せず、1つずつ開く。
 */
export default function HintBox({ hints }: { hints: string[] }) {
  const [revealed, setRevealed] = useState(0);

  if (hints.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <h4 className="text-xs font-bold text-slate-500">ヒント</h4>
      {hints.slice(0, revealed).map((hint, i) => (
        <div key={i} className="rounded-lg bg-yellow-50 px-3 py-2 text-xs leading-relaxed text-yellow-800">
          <span className="font-bold">ヒント{i + 1}: </span>
          {hint}
        </div>
      ))}
      {revealed < hints.length && (
        <button
          onClick={() => setRevealed((n) => n + 1)}
          className="rounded-lg border border-yellow-200 bg-white px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-50"
        >
          ヒント{revealed + 1}を見る({revealed + 1}/{hints.length})
        </button>
      )}
    </div>
  );
}
