// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProblemCard from "./ProblemCard";
import type { Language, Problem } from "@/types/problem";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "2つの数の和",
    difficulty: "入門",
    topic: "入出力",
    supportedLanguages: ["c", "python", "javascript", "typescript"] as Language[],
    statement: "AとBの合計を出力してください。",
    inputFormat: "1行に A と B",
    outputFormat: "合計を1行で",
    constraints: ["0 <= A <= 100"],
    samples: [{ input: "3 5", output: "8" }],
    testInputs: ["3 5"],
    tests: [{ input: "3 5", expected: "8" }],
    referenceSolutions: { python: "print(1)" },
    hints: ["足し算です"],
    explanation: "足すだけです。",
    ...overrides,
  };
}

describe("ProblemCard", () => {
  it("問題文とサンプルを表示する", () => {
    render(<ProblemCard problem={makeProblem()} fromCache={false} />);
    expect(screen.getByText("2つの数の和")).toBeInTheDocument();
    expect(screen.getByText("AとBの合計を出力してください。")).toBeInTheDocument();
    expect(screen.getByText("サンプル 1")).toBeInTheDocument();
  });

  it("キャッシュから出した問題はその旨を出す", () => {
    render(<ProblemCard problem={makeProblem()} fromCache />);
    expect(screen.getByText("AI生成(キャッシュ)")).toBeInTheDocument();
  });

  it("教材を参考にした問題にはバッジを出す", () => {
    render(<ProblemCard problem={makeProblem()} fromCache={false} usedSource />);
    expect(screen.getByText("教材を参考")).toBeInTheDocument();
  });

  it("教材を使っていなければバッジを出さない", () => {
    render(<ProblemCard problem={makeProblem()} fromCache={false} />);
    expect(screen.queryByText("教材を参考")).not.toBeInTheDocument();
  });

  it("標準入出力の問題は「入力形式/出力形式/制約」で見せる", () => {
    render(<ProblemCard problem={makeProblem()} fromCache={false} />);
    expect(screen.getByText("入力形式")).toBeInTheDocument();
    expect(screen.getByText("出力形式")).toBeInTheDocument();
    expect(screen.getByText("制約")).toBeInTheDocument();
  });

  it("HTML問題は入出力が無いので見出しを言い換える", () => {
    const problem = makeProblem({
      supportedLanguages: ["html"],
      samples: [],
      constraints: ["大きな見出し(h1)がある"],
    });
    render(<ProblemCard problem={problem} fromCache={false} />);
    expect(screen.getByText("書き方")).toBeInTheDocument();
    expect(screen.getByText("採点方法")).toBeInTheDocument();
    expect(screen.getByText("確認する項目")).toBeInTheDocument();
    expect(screen.queryByText("入力形式")).not.toBeInTheDocument();
    // サンプルが無くても壊れない
    expect(screen.queryByText("サンプル 1")).not.toBeInTheDocument();
  });
});
