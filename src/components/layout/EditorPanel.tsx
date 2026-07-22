"use client";

import { useState } from "react";
import { LuPlay } from "react-icons/lu";
import type { Language } from "@/types/problem";
import CodeEditor from "@/components/editor/CodeEditor";

/** 表示する模範解答。出どころ(AI生成問題/教材)はモードごとに違うので親が組み立てる。 */
export type AnswerView = { label: string; code: string; explanation?: string };

type Props = {
  language: Language;
  code: string;
  running: boolean;
  runLabel: string | null;
  canRun: boolean;
  /** 模範解答。null なら「答えを見る」ボタンを出さない */
  answer: AnswerView | null;
  /** 標準入力欄。null なら欄を出さない(AI生成モードはテストケースから入力するため不要) */
  stdin: { value: string; onChange: (v: string) => void } | null;
  /** これが変わると答えの表示状態をリセットする(問題や言語の切り替え) */
  answerResetKey: string;
  /** 問題が未選択のときの案内文(モードによって促す操作が違う) */
  emptyHint: string;
  hasResults: boolean;
  /** 実行結果とレビューの表示領域。モードごとに中身が違うので親から差し込む */
  resultNode: React.ReactNode;
  onCodeChange: (code: string) => void;
  onRun: () => void;
};

export default function EditorPanel(props: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);

  // 問題や言語が変わったら答え表示をリセットする(レンダー中に検知する派生state方式)
  const [prevResetKey, setPrevResetKey] = useState(props.answerResetKey);
  if (prevResetKey !== props.answerResetKey) {
    setPrevResetKey(props.answerResetKey);
    setConfirmOpen(false);
    setAnswerOpen(false);
  }

  const canShowAnswer = props.answer !== null && props.canRun;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* 実行結果が出たらエディタを固定の高さに縮め、結果とレビューが常に見えるようにする */}
      <div className={props.hasResults ? "min-h-[140px] shrink-0 basis-[38%]" : "min-h-0 flex-1"}>
        <CodeEditor language={props.language} value={props.code} onChange={props.onCodeChange} />
      </div>

      {props.stdin && (
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">標準入力</span>
            <textarea
              value={props.stdin.value}
              onChange={(e) => props.stdin?.onChange(e.target.value)}
              rows={2}
              placeholder="プログラムに入力する値を入れます(scanfで読む値。複数ある場合は改行かスペースで区切ります)"
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-700 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </label>
        </div>
      )}

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
        {!props.canRun && !props.running && <span className="text-xs text-slate-400">{props.emptyHint}</span>}
        {props.running && props.runLabel && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            {props.runLabel}
          </span>
        )}
        {answerOpen && !props.running && (
          <span className="text-xs text-slate-400">答えを見たため実行できません(別の問題に切り替えてください)</span>
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

      {answerOpen && props.answer && (
        <div className="shrink-0 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 shadow-sm">
          <h3 className="text-sm font-bold text-blue-800">模範解答</h3>
          <p className="mt-1 text-xs text-blue-700">表示言語: {props.answer.label}</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
            {props.answer.code}
          </pre>
          {props.answer.explanation?.trim() && (
            <>
              <h4 className="mt-3 text-xs font-bold text-blue-800">解説</h4>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
                {props.answer.explanation}
              </p>
            </>
          )}
        </div>
      )}

      {props.hasResults && <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">{props.resultNode}</div>}

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
