"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty, Language, Problem } from "@/types/problem";
import type { JudgeResult } from "@/types/judge";
import type { Review, Submission } from "@/types/submission";
import { generateProblem } from "@/lib/ai/generateProblem";
import { generateReview } from "@/lib/ai/generateReview";
import { judge } from "@/lib/judge/judge";
import { getLanguageConfig } from "@/lib/languages";
import { getDraft, saveDraft } from "@/lib/storage/drafts";
import { getGeneratedProblem } from "@/lib/storage/problems";
import { clearSubmissions, deleteSubmission, listSubmissions, saveSubmission } from "@/lib/storage/submissions";
import { getSetting, setSetting } from "@/lib/storage/settings";
import type { GenerationView } from "@/components/problem/GenerationProgress";
import LeftPanel from "./LeftPanel";
import EditorPanel from "./EditorPanel";
import HistorySidebar from "./HistorySidebar";

export default function AppShell() {
  const [language, setLanguage] = useState<Language>("python");
  const [difficulty, setDifficulty] = useState<Difficulty>("入門");
  const [topic, setTopic] = useState("入出力");

  const [problem, setProblem] = useState<Problem | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genView, setGenView] = useState<GenerationView | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [code, setCode] = useState(getLanguageConfig("python").template);
  const [running, setRunning] = useState(false);
  const [runLabel, setRunLabel] = useState<string | null>(null);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期化: 履歴と前回設定の読み込み
  useEffect(() => {
    listSubmissions().then(setSubmissions).catch(console.warn);
    getSetting<{ language: Language; difficulty: Difficulty; topic: string }>("lastSelection")
      .then((saved) => {
        if (saved) {
          setLanguage(saved.language);
          setDifficulty(saved.difficulty);
          setTopic(saved.topic);
          setCode(getLanguageConfig(saved.language).template);
        }
      })
      .catch(console.warn);
  }, []);

  useEffect(() => {
    setSetting("lastSelection", { language, difficulty, topic }).catch(console.warn);
  }, [language, difficulty, topic]);

  const handleLanguageChange = useCallback(
    async (next: Language) => {
      setLanguage(next);
      if (problem) {
        const draft = await getDraft(problem.id, next);
        setCode(draft ?? getLanguageConfig(next).template);
      } else {
        setCode(getLanguageConfig(next).template);
      }
    },
    [problem],
  );

  const handleCodeChange = useCallback(
    (next: string) => {
      setCode(next);
      if (!problem) return;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        saveDraft(problem.id, language, next).catch(console.warn);
      }, 800);
    },
    [problem, language],
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    setGenView({ phase: "preparing", modelPct: null, attempt: 1 });
    setJudgeResult(null);
    setReview(null);
    setSelectedSubmissionId(null);

    try {
      const result = await generateProblem({ language, difficulty, topic }, (p) => {
        if (p.phase === "loading-model") {
          setGenView((prev) => ({
            phase: "loading-model",
            modelPct: Math.round(p.detail.progress * 100),
            attempt: prev?.attempt ?? 1,
          }));
        } else {
          setGenView({ phase: p.phase, modelPct: null, attempt: p.attempt });
        }
      });

      if (result.ok) {
        setProblem(result.problem);
        setFromCache(result.fromCache);
        const draft = await getDraft(result.problem.id, language);
        setCode(draft ?? getLanguageConfig(language).template);
      } else {
        setGenerateError(result.message);
      }
    } catch (err) {
      console.warn("[AppShell] 問題生成エラー:", err);
      setGenerateError("問題生成に失敗しました。条件を変えてもう一度試してください。");
    } finally {
      setGenerating(false);
      setGenView(null);
    }
  }, [language, difficulty, topic]);

  const handleRun = useCallback(async () => {
    if (!problem || running) return;
    setRunning(true);
    setJudgeResult(null);
    setReview(null);
    setSelectedSubmissionId(null);
    setRunLabel(
      language === "python"
        ? "実行中…(初回はPython実行環境の準備に少し時間がかかります)"
        : language === "c"
          ? "実行中…(初回はCコンパイラの準備に時間がかかります)"
          : "実行中…",
    );

    try {
      const result = await judge(problem, language, code);
      setJudgeResult(result);
      setRunning(false);
      setRunLabel(null);

      // レビュー生成(AI失敗時は機械レビュー)
      setReviewLoading(true);
      let rev: Review;
      try {
        rev = await generateReview({ problem, language, code, judgeResult: result });
      } finally {
        setReviewLoading(false);
      }
      setReview(rev);

      // 履歴保存
      const submission: Submission = {
        id: crypto.randomUUID(),
        problemId: problem.id,
        problemTitle: problem.title,
        language,
        code,
        status: result.status,
        judgeResult: result,
        review: rev,
        createdAt: new Date().toISOString(),
      };
      await saveSubmission(submission);
      setSubmissions(await listSubmissions());
    } catch (err) {
      console.warn("[AppShell] 実行エラー:", err);
      setRunning(false);
      setRunLabel(null);
      setJudgeResult({
        status: "RE",
        passedCount: 0,
        totalCount: problem.tests.length,
        message: `実行環境でエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
        elapsedMs: 0,
      });
    }
  }, [problem, language, code, running]);

  // 履歴の個別削除。選択中のものを消したら結果表示もクリアする。
  const handleDeleteSubmission = useCallback(
    async (s: Submission) => {
      await deleteSubmission(s.id);
      setSubmissions((prev) => prev.filter((x) => x.id !== s.id));
      if (selectedSubmissionId === s.id) {
        setSelectedSubmissionId(null);
        setJudgeResult(null);
        setReview(null);
      }
    },
    [selectedSubmissionId],
  );

  // 履歴の全削除
  const handleClearSubmissions = useCallback(async () => {
    if (!window.confirm("実行履歴をすべて削除します。よろしいですか?")) return;
    await clearSubmissions();
    setSubmissions([]);
    setSelectedSubmissionId(null);
    setJudgeResult(null);
    setReview(null);
  }, []);

  // 履歴クリックで過去のコード・結果・レビューを復元
  const handleSelectSubmission = useCallback(async (s: Submission) => {
    setSelectedSubmissionId(s.id);
    setLanguage(s.language);
    setCode(s.code);
    setJudgeResult(s.judgeResult);
    setReview(s.review ?? null);
    const restored = await getGeneratedProblem(s.problemId);
    if (restored) {
      setProblem(restored);
      setFromCache(false);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2">
        <h1 className="text-base font-bold text-slate-800">AIコード練習</h1>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-500">
          ブラウザ内AI・実行環境(外部API不使用)
        </span>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(280px,22%)_1fr_minmax(200px,16%)] grid-rows-[minmax(0,1fr)] gap-3 p-3">
        <LeftPanel
          language={language}
          difficulty={difficulty}
          topic={topic}
          problem={problem}
          fromCache={fromCache}
          generating={generating}
          genView={genView}
          generateError={generateError}
          onLanguageChange={handleLanguageChange}
          onDifficultyChange={setDifficulty}
          onTopicChange={setTopic}
          onGenerate={handleGenerate}
        />

        <EditorPanel
          problem={problem}
          language={language}
          code={code}
          running={running}
          runLabel={runLabel}
          canRun={problem !== null}
          judgeResult={judgeResult}
          review={review}
          reviewLoading={reviewLoading}
          onCodeChange={handleCodeChange}
          onRun={handleRun}
        />

        <HistorySidebar
          submissions={submissions}
          selectedId={selectedSubmissionId}
          onSelect={handleSelectSubmission}
          onDelete={handleDeleteSubmission}
          onClear={handleClearSubmissions}
        />
      </main>
    </div>
  );
}
