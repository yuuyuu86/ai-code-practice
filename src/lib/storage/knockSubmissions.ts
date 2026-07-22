import type { KnockSubmission } from "@/types/submission";
import { getDB } from "./db";

export async function saveKnockSubmission(submission: KnockSubmission): Promise<void> {
  const db = await getDB();
  await db.put("knockSubmissions", submission);
}

export async function listKnockSubmissions(limit = 100): Promise<KnockSubmission[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("knockSubmissions", "by-createdAt");
  return all.reverse().slice(0, limit);
}

export async function getKnockSubmission(id: string): Promise<KnockSubmission | undefined> {
  const db = await getDB();
  return db.get("knockSubmissions", id);
}

export async function deleteKnockSubmission(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("knockSubmissions", id);
}

export async function clearKnockSubmissions(): Promise<void> {
  const db = await getDB();
  await db.clear("knockSubmissions");
}
