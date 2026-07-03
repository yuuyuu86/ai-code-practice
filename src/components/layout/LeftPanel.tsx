"use client";

import type { Difficulty, Language, Problem } from "@/types/problem";
import ProblemControls from "@/components/problem/ProblemControls";
import ProblemCard from "@/components/problem/ProblemCard";
import GenerationProgress, { type GenerationView } from "@/components/problem/GenerationProgress";

type Props = {
  language: Language;
  difficulty: Difficulty;
  topic: string;
  problem: Problem | null;
  fromCache: boolean;
  generating: boolean;
  genView: GenerationView | null;
  generateError: string | null;
  onLanguageChange: (l: Language) => void;
  onDifficultyChange: (d: Difficulty) => void;
  onTopicChange: (t: string) => void;
  onGenerate: () => void;
};

export default function LeftPanel(props: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <ProblemControls
        language={props.language}
        difficulty={props.difficulty}
        topic={props.topic}
        generating={props.generating}
        onLanguageChange={props.onLanguageChange}
        onDifficultyChange={props.onDifficultyChange}
        onTopicChange={props.onTopicChange}
        onGenerate={props.onGenerate}
      />

      {props.generating && props.genView && <GenerationProgress view={props.genView} />}

      {props.generateError && (
        <div className="whitespace-pre-wrap rounded-2xl border border-orange-200 bg-orange-50 p-4 text-xs leading-relaxed text-orange-700">
          {props.generateError}
        </div>
      )}

      {props.problem ? (
        <ProblemCard problem={props.problem} fromCache={props.fromCache} />
      ) : (
        !props.generating &&
        !props.generateError && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-xs leading-relaxed text-slate-400">
            「問題を生成」ボタンを押すと、
            <br />
            AIがあなたに合わせた問題を作ります。
            <br />
            <span className="mt-2 block text-[10px]">初回はAIモデルのダウンロードに数分かかることがあります。</span>
          </div>
        )
      )}
    </div>
  );
}
