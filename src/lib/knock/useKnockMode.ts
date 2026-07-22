"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KnockGroup, KnockProblem } from "@/data/knock100";
import { getKnockProblem, pickRandomKnock } from "@/data/knock100";
import type { KnockSubmission, Review } from "@/types/submission";
import type { RunnerResult } from "@/lib/runners/types";
import { DEFAULT_OUTPUT_LIMIT, DEFAULT_TIMEOUT_MS } from "@/lib/runners/types";
import { getRunner } from "@/lib/runners/runnerManager";
import { generateKnockReview } from "@/lib/ai/generateKnockReview";
import { getDraft, saveDraft } from "@/lib/storage/drafts";
import {
  clearKnockSubmissions,
  deleteKnockSubmission,
  listKnockSubmissions,
  saveKnockSubmission,
} from "@/lib/storage/knockSubmissions";

/** 教材はC言語のみ。下書きキーは既存のdrafts.tsを流用するため knock-NN 形式にする。 */
const KNOCK_LANGUAGE = "c" as const;
const DEFAULT_CODE = "#include <stdio.h>\n\nint main(void) {\n    // ここにコードを書きましょう\n    return 0;\n}\n";

function draftIdOf(problem: KnockProblem): string {
  return `knock-${problem.noText}`;
}

export type KnockState = {
  problem: KnockProblem | null;
  group: KnockGroup | "すべて";
  code: string;
  stdin: string;
  running: boolean;
  runLabel: string | null;
  runResult: RunnerResult | null;
  review: Review | null;
  reviewLoading: boolean;
  reviewLabel: string | null;
  submissions: KnockSubmission[];
  selectedSubmissionId: string | null;
};

export function useKnockMode() {
  const [problem, setProblem] = useState<KnockProblem | null>(null);
  const [group, setGroup] = useState<KnockGroup | "すべて">("すべて");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [runLabel, setRunLabel] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunnerResult | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewLabel, setReviewLabel] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<KnockSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listKnockSubmissions().then(setSubmissions).catch(console.warn);
  }, []);

  /** 問題を選ぶ。下書きがあれば復元する。 */
  const selectProblem = useCallback(async (next: KnockProblem) => {
    setProblem(next);
    setRunResult(null);
    setReview(null);
    setSelectedSubmissionId(null);
    setStdin("");
    const draft = await getDraft(draftIdOf(next), KNOCK_LANGUAGE);
    setCode(draft ?? DEFAULT_CODE);
  }, []);

  const pickRandom = useCallback(() => {
    const next = pickRandomKnock(group === "すべて" ? undefined : group);
    void selectProblem(next);
  }, [group, selectProblem]);

  const changeCode = useCallback(
    (next: string) => {
      setCode(next);
      if (!problem) return;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        saveDraft(draftIdOf(problem), KNOCK_LANGUAGE, next).catch(console.warn);
      }, 800);
    },
    [problem],
  );

  /** 実行 → AIレビュー → 履歴保存。合否判定は行わない。 */
  const run = useCallback(async () => {
    if (!problem || running) return;
    setRunning(true);
    setRunResult(null);
    setReview(null);
    setSelectedSubmissionId(null);
    setRunLabel("実行中…(初回はCコンパイラの準備に時間がかかります)");

    try {
      const result = await getRunner(KNOCK_LANGUAGE).run({
        code,
        input: stdin,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        outputLimit: DEFAULT_OUTPUT_LIMIT,
      });
      setRunResult(result);
      setRunning(false);
      setRunLabel(null);

      setReviewLoading(true);
      setReviewLabel(null);
      let rev: Review;
      try {
        rev = await generateKnockReview({
          problem,
          code,
          stdin,
          stdout: result.stdout,
          stderr: result.stderr,
          runType: result.type,
          onProgress: (p) => setReviewLabel(`AIモデルを読み込み中… ${Math.round(p.progress * 100)}%`),
        });
      } finally {
        setReviewLoading(false);
        setReviewLabel(null);
      }
      setReview(rev);

      const submission: KnockSubmission = {
        id: crypto.randomUUID(),
        knockNo: problem.no,
        knockTitle: problem.title,
        code,
        stdin,
        stdout: result.stdout,
        stderr: result.stderr,
        runType: result.type,
        review: rev,
        createdAt: new Date().toISOString(),
      };
      await saveKnockSubmission(submission);
      setSubmissions(await listKnockSubmissions());
    } catch (err) {
      console.warn("[useKnockMode] 実行エラー:", err);
      setRunning(false);
      setRunLabel(null);
      setRunResult({
        type: "runtime-error",
        stdout: "",
        stderr: `実行環境でエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
        elapsedMs: 0,
      });
    }
  }, [problem, code, stdin, running]);

  /** 履歴クリックで過去のコード・入力・結果・レビューを復元 */
  const selectSubmission = useCallback((s: KnockSubmission) => {
    setSelectedSubmissionId(s.id);
    setCode(s.code);
    setStdin(s.stdin);
    setRunResult({ type: s.runType, stdout: s.stdout, stderr: s.stderr, elapsedMs: 0 });
    setReview(s.review ?? null);
    const restored = getKnockProblem(s.knockNo);
    if (restored) setProblem(restored);
  }, []);

  const deleteSubmission = useCallback(
    async (s: KnockSubmission) => {
      await deleteKnockSubmission(s.id);
      setSubmissions((prev) => prev.filter((x) => x.id !== s.id));
      if (selectedSubmissionId === s.id) {
        setSelectedSubmissionId(null);
        setRunResult(null);
        setReview(null);
      }
    },
    [selectedSubmissionId],
  );

  const clearSubmissions = useCallback(async () => {
    if (!window.confirm("教材モードの実行履歴をすべて削除します。よろしいですか?")) return;
    await clearKnockSubmissions();
    setSubmissions([]);
    setSelectedSubmissionId(null);
    setRunResult(null);
    setReview(null);
  }, []);

  return {
    problem,
    group,
    code,
    stdin,
    running,
    runLabel,
    runResult,
    review,
    reviewLoading,
    reviewLabel,
    submissions,
    selectedSubmissionId,
    setGroup,
    setStdin,
    selectProblem,
    pickRandom,
    changeCode,
    run,
    selectSubmission,
    deleteSubmission,
    clearSubmissions,
  };
}
