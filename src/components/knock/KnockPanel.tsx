"use client";

import { LuShuffle } from "react-icons/lu";
import type { KnockGroup, KnockProblem } from "@/data/knock100";
import { KNOCK_GROUPS, KNOCK_PROBLEMS } from "@/data/knock100";
import { describeJudgeMethod } from "@/lib/knock/knockJudge";

type Props = {
  problem: KnockProblem | null;
  group: KnockGroup | "すべて";
  onGroupChange: (g: KnockGroup | "すべて") => void;
  onPickRandom: () => void;
  onSelect: (p: KnockProblem) => void;
};

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none";

export default function KnockPanel(props: Props) {
  const list =
    props.group === "すべて" ? KNOCK_PROBLEMS : KNOCK_PROBLEMS.filter((p) => p.group === props.group);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      {/* 出題コントロール */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">単元</span>
          <select
            className={selectClass}
            value={props.group}
            onChange={(e) => props.onGroupChange(e.target.value as KnockGroup | "すべて")}
          >
            <option value="すべて">すべて({KNOCK_PROBLEMS.length}問)</option>
            {KNOCK_GROUPS.map((g) => (
              <option key={g.group} value={g.group}>
                {g.group}({KNOCK_PROBLEMS.filter((p) => p.group === g.group).length}問) - {g.detail}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={props.onPickRandom}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600"
        >
          <LuShuffle className="h-3.5 w-3.5" />
          ランダムに出題
        </button>
      </div>

      {/* 選択中の問題 */}
      {props.problem && (
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              教材 No.{props.problem.noText}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {props.problem.group}
            </span>
          </div>
          <h2 className="mt-2.5 text-base font-bold text-slate-800">{props.problem.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {props.problem.statement}
          </p>
          <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-400">
            {describeJudgeMethod(props.problem.no)}
          </p>
        </div>
      )}

      {/* 問題一覧 */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="shrink-0 border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
          問題一覧({list.length}問)
        </h3>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {list.map((p) => (
            <li key={p.no}>
              <button
                onClick={() => props.onSelect(p)}
                className={`w-full rounded-lg px-2 py-1.5 text-left transition ${
                  props.problem?.no === p.no ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="font-mono text-[10px] text-slate-400">{p.noText}</span>
                <span className="ml-1.5 text-xs">{p.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
