"use client";

import { useState } from "react";
import { LuPlay } from "react-icons/lu";
import type { Language, Problem } from "@/types/problem";
import type { JudgeResult } from "@/types/judge";
import type { Review } from "@/types/submission";
import { getLanguageConfig } from "@/lib/languages";
import CodeEditor from "@/components/editor/CodeEditor";
import RunResult from "@/components/result/RunResult";
import ReviewPanel from "@/components/result/ReviewPanel";

type Props = {
  problem: Problem | null;
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

function getReferenceSolution(problem: Problem, language: Language): { label: string; code: string } {
  const direct = problem.referenceSolutions[language];
  if (direct) {
    return { label: getLanguageConfig(language).label, code: direct };
  }
  return { label: "Python", code: problem.referenceSolutions.python };
}

export default function EditorPanel(props: Props) {
  const hasResults = props.judgeResult !== null || props.review !== null || props.reviewLoading;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const canShowAnswer = props.problem !== null && props.judgeResult !== null;

  // 問題や言語が変わったら答え表示をリセットする(レンダー中に検知する派生state方式)
  const answerResetKey = `${props.problem?.id}:${props.language}`;
  const [prevAnswerResetKey, setPrevAnswerResetKey] = useState(answerResetKey);
  if (prevAnswerResetKey !== answerResetKey) {
    setPrevAnswerResetKey(answerResetKey);
    setConfirmOpen(false);
    setAnswerOpen(false);
  }

  const answer = props.problem ? getReferenceSolution(props.problem, props.language) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* 実行結果が出たらエディタを固定の高さに縮め、結果とレビューが常に見えるようにする */}
      <div className={hasResults ? "min-h-[140px] shrink-0 basis-[38%]" : "min-h-0 flex-1"}>
        <CodeEditor language={props.language} value={props.code} onChange={props.onCodeChange} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={props.onRun}
          disabled={props.running || !props.canRun || answerOpen}
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
        {answerOpen && !props.running && (
          <span className="text-xs text-slate-400">答えを見たため実行できません(別の問題か言語に切り替えてください)</span>
        )}
        {props.running && props.runLabel && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            {props.runLabel}
          </span>
        )}
        {canShowAnswer && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            答えを見る
          </button>
        )}
      </div>

      {answerOpen && answer && props.problem && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 shadow-sm">
          <h3 className="text-sm font-bold text-blue-800">模範解答</h3>
          <p className="mt-1 text-xs text-blue-700">表示言語: {answer.label}</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
            {answer.code}
          </pre>
          {props.problem.explanation.trim() && (
            <>
              <h4 className="mt-3 text-xs font-bold text-blue-800">解説</h4>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
                {props.problem.explanation}
              </p>
            </>
          )}
        </div>
      )}

      {hasResults && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto">
            {props.judgeResult && <RunResult result={props.judgeResult} />}
          </div>
          <div className="min-h-0 overflow-y-auto">
            <ReviewPanel review={props.review} loading={props.reviewLoading} />
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">本当に答えを見ますか？</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              模範解答を見ると、自分で考える前に答えがわかってしまいます。必要なら見ても大丈夫ですが、先にコードを見直してからでも遅くありません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                まだ見ない
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setAnswerOpen(true);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                見る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
