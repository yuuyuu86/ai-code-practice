// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProblemControls from "./ProblemControls";
import type { Language } from "@/types/problem";

function setup(overrides: Partial<Parameters<typeof ProblemControls>[0]> = {}) {
  const props = {
    language: "python" as Language,
    difficulty: "入門" as const,
    topic: "入出力",
    generating: false,
    onLanguageChange: vi.fn(),
    onDifficultyChange: vi.fn(),
    onTopicChange: vi.fn(),
    onGenerate: vi.fn(),
    ...overrides,
  };
  render(<ProblemControls {...props} />);
  return props;
}

describe("ProblemControls", () => {
  it("使える言語がすべて選べる", () => {
    setup();
    const select = screen.getByLabelText("言語", { selector: "select" });
    const labels = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toEqual(["C", "Python", "JavaScript", "TypeScript", "SQL", "HTML/CSS/JS"]);
  });

  it("SQLを選ぶとSQL用の単元が並ぶ", () => {
    setup({ language: "sql", topic: "絞り込み" });
    const topics = Array.from(
      screen.getByLabelText("単元", { selector: "select" }).querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(topics).toContain("テーブル結合");
    expect(topics).not.toContain("繰り返し");
  });

  it("HTMLを選ぶとHTML用の単元が並ぶ", () => {
    setup({ language: "html", topic: "見出しと段落" });
    const topics = Array.from(
      screen.getByLabelText("単元", { selector: "select" }).querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(topics).toContain("CSSで装飾");
    expect(topics).not.toContain("配列");
  });

  it("言語を変えると通知される", async () => {
    const props = setup();
    await userEvent.selectOptions(screen.getByLabelText("言語", { selector: "select" }), "sql");
    expect(props.onLanguageChange).toHaveBeenCalledWith("sql");
  });

  it("生成中は「問題を生成」を押せない", () => {
    setup({ generating: true });
    expect(screen.getByRole("button", { name: "生成中…" })).toBeDisabled();
  });

  it("生成中でなければ押せて、通知される", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "問題を生成" }));
    expect(props.onGenerate).toHaveBeenCalledOnce();
  });
});
