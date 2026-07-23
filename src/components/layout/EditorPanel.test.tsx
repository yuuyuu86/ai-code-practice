// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditorPanel from "./EditorPanel";

// Monacoはjsdomで動かないので、値の受け渡しだけを見る差し替えにする
vi.mock("@/components/editor/CodeEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
    <textarea aria-label="コード" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

function setup(overrides: Partial<Parameters<typeof EditorPanel>[0]> = {}) {
  const props = {
    language: "python" as const,
    code: "print(1)",
    running: false,
    runLabel: null,
    canRun: true,
    answer: { label: "Python", code: "print(1)", explanation: "1を表示します。" },
    stdin: null,
    answerResetKey: "problem-1:python",
    emptyHint: "まず問題を生成してください",
    hasResults: false,
    resultNode: null,
    onCodeChange: vi.fn(),
    onRun: vi.fn(),
    ...overrides,
  };
  const view = render(<EditorPanel {...props} />);
  return { props, view };
}

async function revealAnswer() {
  await userEvent.click(screen.getByRole("button", { name: "答えを見る" }));
  await userEvent.click(screen.getByRole("button", { name: "見る" }));
}

describe("EditorPanel", () => {
  it("問題があれば実行できる", async () => {
    const { props } = setup();
    await userEvent.click(screen.getByRole("button", { name: "実行" }));
    expect(props.onRun).toHaveBeenCalledOnce();
  });

  it("問題が無ければ実行できず、案内文が出る", () => {
    setup({ canRun: false });
    expect(screen.getByRole("button", { name: "実行" })).toBeDisabled();
    expect(screen.getByText("まず問題を生成してください")).toBeInTheDocument();
  });

  it("答えを見る前に確認をはさむ", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "答えを見る" }));
    expect(screen.getByText("本当に答えを見ますか？")).toBeInTheDocument();
    // まだ答えは出ていない
    expect(screen.queryByText("模範解答")).not.toBeInTheDocument();
  });

  it("「まだ見ない」を選べば答えは出ない", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "答えを見る" }));
    await userEvent.click(screen.getByRole("button", { name: "まだ見ない" }));
    expect(screen.queryByText("模範解答")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "実行" })).toBeEnabled();
  });

  it("答えを見たあとは実行できない", async () => {
    setup();
    await revealAnswer();
    expect(screen.getByText("模範解答")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "実行" })).toBeDisabled();
    expect(screen.getByText(/答えを見たため実行できません/)).toBeInTheDocument();
  });

  it("別の問題に切り替えれば、また実行できる", async () => {
    const { props, view } = setup();
    await revealAnswer();
    expect(screen.getByRole("button", { name: "実行" })).toBeDisabled();

    view.rerender(<EditorPanel {...props} answerResetKey="problem-2:python" />);
    expect(screen.queryByText("模範解答")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "実行" })).toBeEnabled();
  });

  it("模範解答が無い問題では「答えを見る」を出さない", () => {
    setup({ answer: null });
    expect(screen.queryByRole("button", { name: "答えを見る" })).not.toBeInTheDocument();
  });

  it("標準入力欄はstdinを渡したときだけ出る", () => {
    const { view, props } = setup();
    expect(screen.queryByLabelText("標準入力")).not.toBeInTheDocument();
    view.rerender(<EditorPanel {...props} stdin={{ value: "3", onChange: vi.fn() }} />);
    expect(screen.getByLabelText("標準入力")).toHaveValue("3");
  });
});
