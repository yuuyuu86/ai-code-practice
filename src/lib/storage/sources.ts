import type { Source, SourceChunk } from "@/types/problem";
import { chunkText } from "@/lib/source/chunkText";
import { getDB } from "./db";

export type SourceWithCount = Source & { chunkCount: number };

/**
 * 教材テキストをチャンクに割って保存する。
 * 保存に失敗しても中途半端に残らないよう、sourcesとsourceChunksは同じトランザクションで書く。
 */
export async function addSource(params: {
  title: string;
  type: Source["type"];
  text: string;
}): Promise<{ ok: true; source: Source; chunkCount: number } | { ok: false; reason: string }> {
  const chunks = chunkText(params.text);
  if (chunks.length === 0) {
    return { ok: false, reason: "取り込める文章がありませんでした。中身のあるテキストを選んでください。" };
  }

  const now = new Date().toISOString();
  const source: Source = {
    id: crypto.randomUUID(),
    title: params.title.trim() || "無題の教材",
    type: params.type,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDB();
  const tx = db.transaction(["sources", "sourceChunks"], "readwrite");
  await tx.objectStore("sources").put(source);
  const chunkStore = tx.objectStore("sourceChunks");
  await Promise.all(
    chunks.map((chunk, index) =>
      chunkStore.put({
        id: `${source.id}:${index}`,
        sourceId: source.id,
        title: chunk.title,
        text: chunk.text,
        topics: chunk.topics,
        createdAt: now,
      } satisfies SourceChunk),
    ),
  );
  await tx.done;

  return { ok: true, source, chunkCount: chunks.length };
}

export async function listSources(): Promise<SourceWithCount[]> {
  const db = await getDB();
  const sources = await db.getAll("sources");
  const withCounts = await Promise.all(
    sources.map(async (source) => ({
      ...source,
      chunkCount: (await db.getAllKeysFromIndex("sourceChunks", "by-sourceId", source.id)).length,
    })),
  );
  return withCounts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSource(sourceId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["sources", "sourceChunks"], "readwrite");
  await tx.objectStore("sources").delete(sourceId);
  const chunkStore = tx.objectStore("sourceChunks");
  const keys = await chunkStore.index("by-sourceId").getAllKeys(sourceId);
  await Promise.all(keys.map((key) => chunkStore.delete(key)));
  await tx.done;
}

/** 教材が1件でも入っているか(UIの出し分け用) */
export async function hasSources(): Promise<boolean> {
  const db = await getDB();
  return (await db.count("sources")) > 0;
}

/** プロンプトに入れる教材抜粋の上限(文字)。小型モデルの文脈長を圧迫しない程度に抑える。 */
export const SOURCE_CONTEXT_MAX_CHARS = 1400;

/**
 * 選ばれた単元に近いチャンクを集めて、プロンプトに入れる抜粋を作る。
 *
 * 埋め込みベクトルは使わない(モデルを増やしたくないため)。
 * chunkText側でつけた単元タグの一致を第一に、次に単元名そのものが本文に出るかで並べる。
 * 該当が無ければ教材を使わない(null)。無関係な抜粋を渡すと問題の質が落ちるため。
 */
export async function buildSourceContext(topic: string): Promise<string | null> {
  const db = await getDB();
  const chunks = await db.getAll("sourceChunks");
  if (chunks.length === 0) return null;

  const scored = chunks
    .map((chunk) => {
      let score = 0;
      if (chunk.topics.includes(topic)) score += 10;
      if (chunk.text.includes(topic)) score += 3;
      // ここまでで0点なら単元と無関係。この後の加点をしてしまうと、
      // 「何かしらタグが付いている」だけで無関係な教材が選ばれてしまう。
      if (score === 0) return { chunk, score: 0 };
      // タグが少ないチャンクほど話題が絞れているので、わずかに優先する
      score += Math.max(0, 3 - chunk.topics.length);
      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const parts: string[] = [];
  let total = 0;
  for (const { chunk } of scored) {
    if (total + chunk.text.length > SOURCE_CONTEXT_MAX_CHARS) break;
    parts.push(chunk.text);
    total += chunk.text.length;
  }
  // 1件も入らないほど長いチャンクしか無い場合は、先頭を切り詰めて使う
  if (parts.length === 0) parts.push(scored[0].chunk.text.slice(0, SOURCE_CONTEXT_MAX_CHARS));

  return parts.join("\n---\n");
}
