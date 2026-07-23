// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GeneratedProblemList from "./GeneratedProblemList";
import type { Problem } from "@/types/problem";

function makeProblem(id: string, title: string): Problem {
  return {
    id,
    title,
    difficulty: "入門",
    topic: "入出力",
    supportedLanguages: ["python"],
    statement: "",
    inputFormat: "",
    outputFormat: "",
    constraints: [],
    samples: [],
    testInputs: [],
    tests: [],
    referenceSolutions: { python: "" },
    hints: [],
    explanation: "",
  };
}

describe("GeneratedProblemList", () => {
  it("問題が無ければ何も出さない", () => {
    const { container } = render(
      <GeneratedProblemList problems={[]} selectedId={null} onSelect={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("件数つきで一覧にする", () => {
    render(
      <GeneratedProblemList
        problems={[makeProblem("a", "問題A"), makeProblem("b", "問題B")]}
        selectedId={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("生成した問題(2)")).toBeInTheDocument();
    expect(screen.getByText("問題A")).toBeInTheDocument();
  });

  it("選ぶと通知される", async () => {
    const onSelect = vi.fn();
    const problem = makeProblem("a", "問題A");
    render(
      <GeneratedProblemList problems={[problem]} selectedId={null} onSelect={onSelect} onDelete={vi.fn()} />,
    );
    await userEvent.click(screen.getByText("問題A"));
    expect(onSelect).toHaveBeenCalledWith(problem);
  });

  it("削除は選択と別のボタンで、選択は呼ばれない", async () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    const problem = makeProblem("a", "問題A");
    render(
      <GeneratedProblemList problems={[problem]} selectedId={null} onSelect={onSelect} onDelete={onDelete} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "この問題を削除" }));
    expect(onDelete).toHaveBeenCalledWith(problem);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
