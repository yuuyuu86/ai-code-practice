"use client";

import { useEffect, useState } from "react";

/** 生成パイプラインの進捗を表す構造化ビュー */
export type GenerationView = {
  phase:
    | "preparing"
    | "loading-model"
    | "drafting-outline"
    | "drafting-details"
    | "solving"
    | "validating"
    | "building-tests";
  /** loading-model のときだけ 0..100。それ以外は null */
  modelPct: number | null;
  /** 何回目の試行か(1〜) */
  attempt: number;
};

type Step = { key: GenerationView["phase"]; label: string; emoji: string };

// 表示順のパイプライン。preparing は最初のステップ(モデル準備)を先取りで光らせる。
const STEPS: Step[] = [
  { key: "loading-model", label: "AIモデルの準備", emoji: "📦" },
  { key: "drafting-outline", label: "問題の骨格づくり", emoji: "✏️" },
  { key: "drafting-details", label: "制約と入力例づくり", emoji: "🧩" },
  { key: "solving", label: "模範解答づくり", emoji: "🧠" },
  { key: "validating", label: "問題のチェック", emoji: "🔍" },
  { key: "building-tests", label: "テストづくり", emoji: "🧪" },
];

function currentIndex(phase: GenerationView["phase"]): number {
  if (phase === "preparing") return 0;
  const i = STEPS.findIndex((s) => s.key === phase);
  return i < 0 ? 0 : i;
}

// 待ち時間に読める、初心者向けのちょいネタ。3.5秒ごとに切り替わる。
const TIPS: string[] = [
  "print は「表示する」命令。まずは出力から仲良くなろう。",
  "エラーは敵じゃなくて道しるべ。1行目をゆっくり読むのがコツ。",
  "変数は「名前をつけた箱」。中身はあとから入れ替えできる。",
  "for は「くり返し」、if は「もし〜なら」。この2つで大半が書ける。",
  "コードは上から順に実行される。順番を意識すると読みやすい。",
  "うまくいかない時は、小さく分けて1つずつ試すと原因が見つかる。",
  "= は「代入」、== は「等しいか判定」。似てるけど別物。",
  "インデント(字下げ)は Python では意味を持つ。ズレに注意。",
  "この問題も模範解答も、いま端末の中のAIが作っています。",
];

export default function GenerationProgress({ view }: { view: GenerationView }) {
  const active = currentIndex(view.phase);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2.5 border-b border-blue-100 px-4 py-3">
        <span className="text-xl" aria-hidden>
          <span className="inline-block animate-bounce">🤖</span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-700">
            AIが問題をつくっています
            <span className="ml-0.5 inline-flex">
              <span className="animate-[gendot_1.2s_infinite]">.</span>
              <span className="animate-[gendot_1.2s_infinite_0.2s]">.</span>
              <span className="animate-[gendot_1.2s_infinite_0.4s]">.</span>
            </span>
          </p>
          {view.attempt > 1 && (
            <p className="text-[11px] font-medium text-blue-500">
              うまくいくまで挑戦中… {view.attempt}回目 💪
            </p>
          )}
        </div>
      </div>

      {/* ステッパー */}
      <ol className="space-y-1 px-3 py-3">
        {STEPS.map((step, i) => {
          const done = i < active;
          const isActive = i === active;
          return (
            <li
              key={step.key}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition ${
                isActive ? "bg-blue-100/70" : ""
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  done
                    ? "bg-green-100 text-green-600"
                    : isActive
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-300"
                }`}
                aria-hidden
              >
                {done ? "✓" : isActive ? <span className="animate-pulse">{step.emoji}</span> : step.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-xs ${
                    isActive ? "font-bold text-slate-700" : done ? "text-slate-400" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                {/* モデル読み込み中はプログレスバー */}
                {isActive && step.key === "loading-model" && view.modelPct != null && (
                  <div className="mt-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${view.modelPct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-blue-500">
                      {view.modelPct}%(初回は数分かかります)
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* 豆知識ローテーション */}
      <div className="border-t border-blue-100 bg-white/70 px-4 py-2.5">
        <p className="text-[10px] font-bold text-slate-400">豆知識</p>
        <p key={tip} className="mt-0.5 animate-[genfade_0.5s_ease] text-xs leading-relaxed text-slate-600">
          💡 {TIPS[tip]}
        </p>
      </div>
    </div>
  );
}
