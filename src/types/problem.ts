export type Language = "c" | "python" | "javascript";

export type Difficulty = "入門" | "初級" | "中級" | "上級";

export type Problem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  supportedLanguages: Language[];
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  samples: Array<{
    input: string;
    output: string;
  }>;
  testInputs: string[];
  tests: Array<{
    input: string;
    expected: string;
  }>;
  referenceSolutions: {
    python: string;
    c?: string;
    javascript?: string;
  };
  hints: string[];
  explanation: string;
  sourceRefs?: Array<{
    sourceId: string;
    title: string;
    chunkId: string;
  }>;
  learningObjectives?: string[];
  createdAt?: string;
};

export type GenerateProblemInput = {
  language: Language;
  difficulty: Difficulty;
  topic: string;
  sourceContext?: string;
};

// Phase 2(教材ソース対応)用。MVPではストアだけ用意する。
export type Source = {
  id: string;
  title: string;
  type: "pdf" | "markdown" | "text" | "slide";
  createdAt: string;
  updatedAt: string;
};

export type SourceChunk = {
  id: string;
  sourceId: string;
  title?: string;
  page?: number;
  text: string;
  topics: string[];
  createdAt: string;
};
