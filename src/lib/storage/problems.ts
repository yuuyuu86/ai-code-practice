import type { Difficulty, Language, Problem } from "@/types/problem";
import { getDB } from "./db";

export function cacheKeyOf(language: Language, difficulty: Difficulty, topic: string): string {
  return `${language}:${difficulty}:${topic}`;
}

export async function saveGeneratedProblem(problem: Problem): Promise<void> {
  const db = await getDB();
  await db.put("generatedProblems", { ...problem, createdAt: problem.createdAt ?? new Date().toISOString() });
}

export async function getGeneratedProblem(id: string): Promise<Problem | undefined> {
  const db = await getDB();
  return db.get("generatedProblems", id);
}

/** 生成済み問題を新しい順に返す。実行せずに終わった問題にも戻れるようにするため。 */
export async function listGeneratedProblems(limit = 50): Promise<Problem[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("generatedProblems", "by-createdAt");
  return all.reverse().slice(0, limit);
}

export async function deleteGeneratedProblem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("generatedProblems", id);
}

/** 検証を通過した問題をフォールバック用にキャッシュする */
export async function cacheAIProblem(problem: Problem, language: Language): Promise<void> {
  const db = await getDB();
  await db.put("cachedAIProblems", {
    ...problem,
    cacheKey: cacheKeyOf(language, problem.difficulty, problem.topic),
    createdAt: problem.createdAt ?? new Date().toISOString(),
  });
}

/**
 * フォールバック用キャッシュ問題を探す。
 * 完全一致 → 同言語・同単元 → 同言語 の順で緩めて探す。
 */
export async function findCachedProblem(
  language: Language,
  difficulty: Difficulty,
  topic: string,
): Promise<Problem | undefined> {
  const db = await getDB();
  const all = await db.getAll("cachedAIProblems");
  const supported = all.filter((p) => p.supportedLanguages.includes(language));
  const exact = supported.filter((p) => p.difficulty === difficulty && p.topic === topic);
  if (exact.length > 0) return pickRandom(exact);
  const sameTopic = supported.filter((p) => p.topic === topic);
  if (sameTopic.length > 0) return pickRandom(sameTopic);
  if (supported.length > 0) return pickRandom(supported);
  return undefined;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
