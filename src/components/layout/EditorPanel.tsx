"use client";

import { LuPlay } from "react-icons/lu";
import type { Language } from "@/types/problem";
import type { JudgeResult } from "@/types/judge";
import type { Review } from "@/types/submission";
import CodeEditor from "@/components/editor/CodeEditor";
import RunResult from "@/components/result/RunResult";
import ReviewPanel from "@/components/result/ReviewPanel";

type Props = {
  language: Language;
  code: string;
  running: boolean;
  runLabel: string | null;
  canRun: boolean;
  judgeResult: JudgeResult | null;
  review: Review | null;
  reviewLoading: boolean;
  onCodeChange: (code: string) => void;
  onRun: () => void;
};

export default function EditorPanel(props: Props) {
  const hasResults = props.judgeResult !== null || props.review !== null || props.reviewLoading;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* 実行結果が出たらエディタを固定の高さに縮め、結果とレビューが常に見えるようにする */}
      <div className={hasResults ? "min-h-[180px] shrink-0 basis-[44%]" : "min-h-0 flex-1"}>
        <CodeEditor language={props.language} value={props.code} onChange={props.onCodeChange} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={props.onRun}
          disabled={props.running || !props.canRun}
          className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {props.running ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
          ) : (
            <LuPlay className="h-3.5 w-3.5" />
          )}
          {props.running ? "実行中…" : "実行"}
        </button>
        {!props.canRun && !props.running && (
          <span className="text-xs text-slate-400">まず問題を生成してください</span>
        )}
        {props.running && props.runLabel && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            {props.runLabel}
          </span>
        )}
      </div>

      {hasResults && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto">
            {props.judgeResult && <RunResult result={props.judgeResult} />}
          </div>
          <div className="min-h-0 overflow-y-auto">
            <ReviewPanel review={props.review} loading={props.reviewLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
