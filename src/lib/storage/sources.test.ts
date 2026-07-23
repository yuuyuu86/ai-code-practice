import { beforeEach, describe, expect, it, vi } from "vitest";
// IndexedDBはNodeに無いので、実装と同じidbライブラリ越しに叩ける疑似実装を入れる。
// これでストア定義・マイグレーション・インデックスまで含めて本物と同じ経路を通せる。
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { SOURCE_CONTEXT_MAX_CHARS } from "./sources";

const LOOP_TEXT = ["# 繰り返し", "for文で1から10まで繰り返して合計を求めます。".repeat(12)].join("\n");
const ARRAY_TEXT = ["# 配列", "配列は添字で要素を指定します。要素数に気をつけましょう。".repeat(12)].join("\n");

/**
 * getDBは接続をモジュール内にキャッシュするので、DBを作り直すだけでは前のテストの
 * データが残ってしまう。モジュールキャッシュごと捨ててから読み込み直す。
 */
async function freshSources() {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  return import("./sources");
}

describe("教材ソースの保存と取り出し", () => {
  let sources: Awaited<ReturnType<typeof freshSources>>;

  beforeEach(async () => {
    sources = await freshSources();
  });

  it("登録するとチャンクに分かれて保存され、一覧に出る", async () => {
    const saved = await sources.addSource({ title: "第3回", type: "text", text: LOOP_TEXT });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.chunkCount).toBeGreaterThan(0);

    const list = await sources.listSources();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("第3回");
    expect(list[0].chunkCount).toBe(saved.chunkCount);
    expect(await sources.hasSources()).toBe(true);
  });

  it("タイトルが空なら「無題の教材」になる", async () => {
    const saved = await sources.addSource({ title: "   ", type: "text", text: LOOP_TEXT });
    expect(saved.ok && saved.source.title).toBe("無題の教材");
  });

  it("中身が無いテキストは登録できない", async () => {
    const saved = await sources.addSource({ title: "空", type: "text", text: "   \n\n " });
    expect(saved.ok).toBe(false);
    expect(await sources.hasSources()).toBe(false);
  });

  it("削除すると本体もチャンクも消える", async () => {
    const saved = await sources.addSource({ title: "消す教材", type: "text", text: LOOP_TEXT });
    if (!saved.ok) throw new Error("前提の登録に失敗");
    await sources.deleteSource(saved.source.id);

    expect(await sources.listSources()).toHaveLength(0);
    expect(await sources.hasSources()).toBe(false);
    // チャンクが残っていると、消したはずの教材が問題生成に混ざってしまう
    expect(await sources.buildSourceContext("繰り返し")).toBeNull();
  });

  it("削除しても他の教材のチャンクは巻き込まれない", async () => {
    const a = await sources.addSource({ title: "繰り返し編", type: "text", text: LOOP_TEXT });
    await sources.addSource({ title: "配列編", type: "text", text: ARRAY_TEXT });
    if (!a.ok) throw new Error("前提の登録に失敗");

    await sources.deleteSource(a.source.id);
    const rest = await sources.listSources();
    expect(rest).toHaveLength(1);
    expect(rest[0].title).toBe("配列編");
    expect(await sources.buildSourceContext("配列")).toContain("添字");
  });
});

describe("buildSourceContext(単元に近い部分だけ渡す)", () => {
  let sources: Awaited<ReturnType<typeof freshSources>>;

  beforeEach(async () => {
    sources = await freshSources();
    await sources.addSource({ title: "第3回", type: "text", text: LOOP_TEXT });
    await sources.addSource({ title: "第4回", type: "text", text: ARRAY_TEXT });
  });

  it("教材が1件も無ければnull", async () => {
    const empty = await freshSources();
    expect(await empty.buildSourceContext("繰り返し")).toBeNull();
  });

  it("選んだ単元に合う教材を返す", async () => {
    const loop = await sources.buildSourceContext("繰り返し");
    expect(loop).not.toBeNull();
    expect(loop).toContain("for文");
  });

  it("関係ない単元ならnull(無関係な抜粋を渡すと問題の質が落ちるため)", async () => {
    expect(await sources.buildSourceContext("関数")).toBeNull();
  });

  it("プロンプトに入れる長さの上限を超えない", async () => {
    await sources.addSource({
      title: "大きい教材",
      type: "text",
      text: ["# 繰り返し", "while文で繰り返します。".repeat(400)].join("\n"),
    });
    const context = await sources.buildSourceContext("繰り返し");
    expect(context).not.toBeNull();
    expect(context!.length).toBeLessThanOrEqual(SOURCE_CONTEXT_MAX_CHARS);
  });
});
