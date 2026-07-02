"use client";

import type { Problem } from "@/types/problem";
import HintBox from "./HintBox";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h4 className="mb-1 text-xs font-bold text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

function Pre({ text }: { text: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
      {text}
    </pre>
  );
}

export default function ProblemCard({ problem, fromCache }: { problem: Problem; fromCache: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
          {fromCache ? "AI生成(キャッシュ)" : "AI生成"}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {problem.difficulty} / {problem.topic}
        </span>
      </div>

      <h2 className="mt-2 text-base font-bold text-slate-800">{problem.title}</h2>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{problem.statement}</p>

      <Section title="入力形式">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{problem.inputFormat}</p>
      </Section>

      <Section title="出力形式">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{problem.outputFormat}</p>
      </Section>

      <Section title="制約">
        <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600">
          {problem.constraints.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </Section>

      {problem.samples.map((sample, i) => (
        <div key={i} className="mt-3 grid grid-cols-1 gap-2">
          <div>
            <h4 className="mb-1 text-xs font-bold text-slate-500">サンプル入力 {i + 1}</h4>
            <Pre text={sample.input} />
          </div>
          <div>
            <h4 className="mb-1 text-xs font-bold text-slate-500">サンプル出力 {i + 1}</h4>
            <Pre text={sample.output} />
          </div>
        </div>
      ))}

      <HintBox hints={problem.hints} />
    </div>
  );
}
