"use client";

import type { Difficulty, Language, Problem } from "@/types/problem";
import ProblemControls from "@/components/problem/ProblemControls";
import ProblemCard from "@/components/problem/ProblemCard";
import GenerationProgress, { type GenerationView } from "@/components/problem/GenerationProgress";
import GeneratedProblemList from "@/components/problem/GeneratedProblemList";

type Props = {
  language: Language;
  difficulty: Difficulty;
  topic: string;
  problem: Problem | null;
  fromCache: boolean;
  generating: boolean;
  genView: GenerationView | null;
  generateError: string | null;
  generatedProblems: Problem[];
  onLanguageChange: (l: Language) => void;
  onDifficultyChange: (d: Difficulty) => void;
  onTopicChange: (t: string) => void;
  onGenerate: () => void;
  onSelectGenerated: (p: Problem) => void;
  onDeleteGenerated: (p: Problem) => void;
};

export default function LeftPanel(props: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto pr-1">
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

      {!props.generating && (
        <GeneratedProblemList
          problems={props.generatedProblems}
          selectedId={props.problem?.id ?? null}
          onSelect={props.onSelectGenerated}
          onDelete={props.onDeleteGenerated}
        />
      )}

      {props.generateError && (
        <div className="whitespace-pre-wrap rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
          {props.generateError}
        </div>
      )}

      {props.problem ? (
        <ProblemCard problem={props.problem} fromCache={props.fromCache} />
      ) : (
        !props.generating &&
        !props.generateError && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-xs leading-relaxed text-slate-400">
            「問題を生成」を押すと問題が作られます。
          </div>
        )
      )}
    </div>
  );
}
