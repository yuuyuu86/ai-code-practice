"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty, Language, Problem } from "@/types/problem";
import type { JudgeResult } from "@/types/judge";
import type { Review, Submission } from "@/types/submission";
import { generateProblem } from "@/lib/ai/generateProblem";
import { generateReview } from "@/lib/ai/generateReview";
import { judge } from "@/lib/judge/judge";
import { getLanguageConfig, topicsFor } from "@/lib/languages";
import { getDraft, saveDraft } from "@/lib/storage/drafts";
import {
  deleteGeneratedProblem,
  getGeneratedProblem,
  listGeneratedProblems,
} from "@/lib/storage/problems";
import { clearSubmissions, deleteSubmission, listSubmissions, saveSubmission } from "@/lib/storage/submissions";
import { getSetting, setSetting } from "@/lib/storage/settings";
import { buildSourceContext } from "@/lib/storage/sources";
import { useKnockMode } from "@/lib/knock/useKnockMode";
import type { GenerationView } from "@/components/problem/GenerationProgress";
import RunResult from "@/components/result/RunResult";
import ReviewPanel from "@/components/result/ReviewPanel";
import HistoryList from "@/components/history/HistoryList";
import KnockPanel from "@/components/knock/KnockPanel";
import KnockRunResult from "@/components/knock/KnockRunResult";
import KnockHistoryList from "@/components/knock/KnockHistoryList";
import ModeTabs, { type AppMode } from "./ModeTabs";
import LeftPanel from "./LeftPanel";
import EditorPanel, { type AnswerView } from "./EditorPanel";
import HistorySidebar from "./HistorySidebar";

export default function AppShell() {
  const [mode, setMode] = useState<AppMode>("ai");

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
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [usedSource, setUsedSource] = useState(false);

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 教材モードの状態とハンドラはフックに分離してAppShellの肥大化を防ぐ
  const knock = useKnockMode();

  // 初期化: 履歴と前回設定の読み込み
  useEffect(() => {
    listSubmissions().then(setSubmissions).catch(console.warn);
    listGeneratedProblems().then(setGeneratedProblems).catch(console.warn);
    getSetting<AppMode>("lastMode")
      .then((saved) => {
        if (saved === "ai" || saved === "knock") setMode(saved);
      })
      .catch(console.warn);
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

  useEffect(() => {
    setSetting("lastMode", mode).catch(console.warn);
  }, [mode]);

  const handleLanguageChange = useCallback(
    async (next: Language) => {
      setLanguage(next);
      // SQLと他言語では選べる単元が違う。前の単元が無い場合は先頭に寄せる。
      const topics = topicsFor(next);
      if (!topics.includes(topic)) setTopic(topics[0]);
      if (problem) {
        const draft = await getDraft(problem.id, next);
        setCode(draft ?? getLanguageConfig(next).template);
      } else {
        setCode(getLanguageConfig(next).template);
      }
    },
    [problem, topic],
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
      // 教材が入っていれば、選んだ単元に近い部分だけを参考として渡す
      const sourceContext = sourceCount > 0 ? await buildSourceContext(topic) : null;
      setUsedSource(sourceContext !== null);

      const result = await generateProblem({ language, difficulty, topic, sourceContext: sourceContext ?? undefined }, (p) => {
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
        setGeneratedProblems(await listGeneratedProblems());
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
  }, [language, difficulty, topic, sourceCount]);

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

  // 生成済み問題を選び直す(実行せずに終わった問題にも戻れるように)
  const handleSelectGenerated = useCallback(
    async (p: Problem) => {
      setProblem(p);
      setFromCache(false);
      setJudgeResult(null);
      setReview(null);
      setSelectedSubmissionId(null);
      const draft = await getDraft(p.id, language);
      setCode(draft ?? getLanguageConfig(language).template);
    },
    [language],
  );

  const handleDeleteGenerated = useCallback(
    async (p: Problem) => {
      await deleteGeneratedProblem(p.id);
      setGeneratedProblems((prev) => prev.filter((x) => x.id !== p.id));
      // 表示中の問題を消したら、問題未選択の状態に戻す
      if (problem?.id === p.id) {
        setProblem(null);
        setJudgeResult(null);
        setReview(null);
      }
    },
    [problem],
  );

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

  const isKnock = mode === "knock";

  // SQL問題はテーブルとSELECT結果で採点するので、他の言語では解けない(逆も同じ)。
  // 言語を切り替えたまま実行すると意味の無い判定になるため、実行させない。
  const languageMatchesProblem = problem === null || problem.supportedLanguages.includes(language);

  // モードごとの模範解答。教材はC言語の解答をそのまま持っている。
  const aiAnswer: AnswerView | null = problem
    ? {
        label: problem.referenceSolutions[language] ? getLanguageConfig(language).label : "Python",
        code: problem.referenceSolutions[language] ?? problem.referenceSolutions.python,
        explanation: problem.explanation,
      }
    : null;
  const knockAnswer: AnswerView | null = knock.problem ? { label: "C", code: knock.problem.solution } : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2">
        <h1 className="text-base font-bold text-slate-800">AIコード練習</h1>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-500">
          ブラウザ内AI・実行環境(外部API不使用)
        </span>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(280px,22%)_1fr_minmax(200px,16%)] grid-rows-[minmax(0,1fr)] gap-3 p-3">
        <div className="flex min-h-0 flex-col gap-2">
          <ModeTabs mode={mode} onChange={setMode} />
          {isKnock ? (
            <KnockPanel
              problem={knock.problem}
              group={knock.group}
              onGroupChange={knock.setGroup}
              onPickRandom={knock.pickRandom}
              onSelect={knock.selectProblem}
            />
          ) : (
            <LeftPanel
              language={language}
              difficulty={difficulty}
              topic={topic}
              problem={problem}
              fromCache={fromCache}
              generating={generating}
              genView={genView}
              generateError={generateError}
              generatedProblems={generatedProblems}
              onLanguageChange={handleLanguageChange}
              onDifficultyChange={setDifficulty}
              onTopicChange={setTopic}
              onGenerate={handleGenerate}
              onSourceCountChange={setSourceCount}
              usedSource={usedSource}
              onSelectGenerated={handleSelectGenerated}
              onDeleteGenerated={handleDeleteGenerated}
            />
          )}
        </div>

        {isKnock ? (
          <EditorPanel
            language="c"
            code={knock.code}
            running={knock.running}
            runLabel={knock.runLabel}
            canRun={knock.problem !== null}
            answer={knockAnswer}
            stdin={{ value: knock.stdin, onChange: knock.setStdin }}
            answerResetKey={`knock-${knock.problem?.no ?? "none"}`}
            emptyHint="まず問題を選んでください"
            hasResults={knock.runResult !== null || knock.review !== null || knock.reviewLoading}
            resultNode={
              <>
                <div className="min-h-0 overflow-y-auto">
                  {knock.runResult && <KnockRunResult result={knock.runResult} verdict={knock.verdict} />}
                </div>
                <div className="min-h-0 overflow-y-auto">
                  <ReviewPanel review={knock.review} loading={knock.reviewLoading} loadingLabel={knock.reviewLabel} />
                </div>
              </>
            }
            onCodeChange={knock.changeCode}
            onRun={knock.run}
          />
        ) : (
          <EditorPanel
            language={language}
            code={code}
            running={running}
            runLabel={runLabel}
            canRun={problem !== null && languageMatchesProblem}
            answer={aiAnswer}
            stdin={null}
            answerResetKey={`${problem?.id ?? "none"}:${language}`}
            emptyHint={
              problem !== null && !languageMatchesProblem
                ? `この問題は${problem.supportedLanguages.map((l) => getLanguageConfig(l).label).join("・")}で解く問題です。言語を戻してください`
                : "まず問題を生成してください"
            }
            hasResults={judgeResult !== null || review !== null || reviewLoading}
            resultNode={
              <>
                <div className="min-h-0 overflow-y-auto">{judgeResult && <RunResult result={judgeResult} />}</div>
                <div className="min-h-0 overflow-y-auto">
                  <ReviewPanel review={review} loading={reviewLoading} />
                </div>
              </>
            }
            onCodeChange={handleCodeChange}
            onRun={handleRun}
          />
        )}

        {isKnock ? (
          <HistorySidebar count={knock.submissions.length} onClear={knock.clearSubmissions}>
            <KnockHistoryList
              submissions={knock.submissions}
              selectedId={knock.selectedSubmissionId}
              onSelect={knock.selectSubmission}
              onDelete={knock.deleteSubmission}
            />
          </HistorySidebar>
        ) : (
          <HistorySidebar count={submissions.length} onClear={handleClearSubmissions}>
            <HistoryList
              submissions={submissions}
              selectedId={selectedSubmissionId}
              onSelect={handleSelectSubmission}
              onDelete={handleDeleteSubmission}
            />
          </HistorySidebar>
        )}
      </main>
    </div>
  );
}
