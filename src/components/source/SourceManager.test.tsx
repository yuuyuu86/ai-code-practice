// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

const MATERIAL = ["# 繰り返し", "for文で1から10まで繰り返して合計を求めます。".repeat(12)].join("\n");

/**
 * getDBは接続をモジュール内にキャッシュするので、DBを作り直すだけでは前のテストの
 * データが残る。モジュールキャッシュごと捨ててから読み込み直す。
 */
async function freshRender(onChange = vi.fn()) {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  const { default: SourceManager } = await import("./SourceManager");
  const view = render(<SourceManager onChange={onChange} />);
  return { view, onChange };
}

async function openPanel() {
  await userEvent.click(screen.getByRole("button", { name: /教材\(/ }));
}

describe("SourceManager", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it("最初は閉じていて、開くと登録手段が出る", async () => {
    await freshRender();
    expect(screen.queryByRole("button", { name: "ファイル" })).not.toBeInTheDocument();
    await openPanel();
    expect(screen.getByRole("button", { name: "ファイル" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "貼り付け" })).toBeInTheDocument();
  });

  it("貼り付けた教材を登録すると、一覧と件数に反映される", async () => {
    const { onChange } = await freshRender();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "貼り付け" }));
    await userEvent.type(screen.getByPlaceholderText("教材の名前(任意)"), "第3回");
    await userEvent.type(screen.getByPlaceholderText("教材の本文を貼り付けてください"), MATERIAL);
    await userEvent.click(screen.getByRole("button", { name: "登録する" }));

    await waitFor(() => expect(screen.getByText("第3回")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /教材\(1\)/ })).toBeInTheDocument();
    // 親(AppShell)は件数を見て、教材を渡すかどうかを決める
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(1));
  });

  it("本文が空なら登録できない", async () => {
    await freshRender();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "貼り付け" }));
    await userEvent.click(screen.getByRole("button", { name: "登録する" }));

    await waitFor(() => expect(screen.getByText("本文が空です。")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /教材\(0\)/ })).toBeInTheDocument();
  });

  it("削除すると一覧から消える", async () => {
    const { onChange } = await freshRender();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "貼り付け" }));
    await userEvent.type(screen.getByPlaceholderText("教材の名前(任意)"), "消す教材");
    await userEvent.type(screen.getByPlaceholderText("教材の本文を貼り付けてください"), MATERIAL);
    await userEvent.click(screen.getByRole("button", { name: "登録する" }));
    await waitFor(() => expect(screen.getByText("消す教材")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "消す教材を削除" }));
    await waitFor(() => expect(screen.queryByText("消す教材")).not.toBeInTheDocument());
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(0));
  });

  it("端末内にしか保存しないことを画面で伝える", async () => {
    await freshRender();
    await openPanel();
    expect(screen.getByText(/外部には送りません/)).toBeInTheDocument();
  });
});
