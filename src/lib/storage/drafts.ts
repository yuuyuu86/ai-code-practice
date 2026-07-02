import type { Language } from "@/types/problem";
import { getDB } from "./db";

export async function saveDraft(problemId: string, language: Language, code: string): Promise<void> {
  const db = await getDB();
  await db.put("codeDrafts", {
    key: `${problemId}:${language}`,
    problemId,
    language,
    code,
    updatedAt: new Date().toISOString(),
  });
}

export async function getDraft(problemId: string, language: Language): Promise<string | undefined> {
  const db = await getDB();
  const row = await db.get("codeDrafts", `${problemId}:${language}`);
  return row?.code;
}
