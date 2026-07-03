"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import { LuSparkles, LuLogIn, LuLogOut, LuListChecks, LuCopy, LuCheck, LuArrowRight } from "react-icons/lu";
import type { Difficulty, Problem } from "@/types/problem";
import HintBox from "./HintBox";

// 難易度ごとの色分け。初心者が難易度感をひと目でつかめるようにする。
const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  入門: "bg-green-100 text-green-700",
  初級: "bg-blue-100 text-blue-700",
  中級: "bg-amber-100 text-amber-700",
  上級: "bg-red-100 text-red-700",
};

function Section({ title, icon: Icon, children }: { title: string; icon: IconType; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* クリップボード不可の環境では何もしない */
        }
      }}
      aria-label="入力例をコピー"
      title="入力例をコピー"
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      {copied ? <LuCheck className="h-3 w-3 text-green-500" /> : <LuCopy className="h-3 w-3" />}
      {copied ? "コピー済" : "コピー"}
    </button>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs leading-relaxed text-slate-700">
      {text || " "}
    </pre>
  );
}

export default function ProblemCard({ problem, fromCache }: { problem: Problem; fromCache: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* バッジ */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
          <LuSparkles className="h-3 w-3" />
          {fromCache ? "AI生成(キャッシュ)" : "AI生成"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DIFFICULTY_STYLE[problem.difficulty]}`}>
          {problem.difficulty}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {problem.topic}
        </span>
      </div>

      <h2 className="mt-2.5 text-base font-bold text-slate-800">{problem.title}</h2>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{problem.statement}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Section title="入力形式" icon={LuLogIn}>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{problem.inputFormat}</p>
        </Section>
        <Section title="出力形式" icon={LuLogOut}>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{problem.outputFormat}</p>
        </Section>
      </div>

      <Section title="制約" icon={LuListChecks}>
        <ul className="space-y-0.5 text-xs text-slate-600">
          {problem.constraints.map((c, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* サンプル: 入力 → 出力 が対で分かるカード */}
      {problem.samples.map((sample, i) => (
        <div key={i} className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">サンプル {i + 1}</span>
          </div>
          <div className="space-y-1.5">
            <div>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400">入力</span>
                <CopyButton text={sample.input} />
              </div>
              <CodeBlock text={sample.input} />
            </div>
            <div className="flex items-center justify-center text-slate-300">
              <LuArrowRight className="h-3.5 w-3.5 rotate-90" aria-hidden />
            </div>
            <div>
              <span className="mb-0.5 block text-[10px] font-medium text-slate-400">出力</span>
              <CodeBlock text={sample.output} />
            </div>
          </div>
        </div>
      ))}

      <HintBox hints={problem.hints} />
    </div>
  );
}
