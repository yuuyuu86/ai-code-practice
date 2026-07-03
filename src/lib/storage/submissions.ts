import type { Submission } from "@/types/submission";
import { getDB } from "./db";

export async function saveSubmission(submission: Submission): Promise<void> {
  const db = await getDB();
  await db.put("submissions", submission);
}

export async function listSubmissions(limit = 100): Promise<Submission[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("submissions", "by-createdAt");
  return all.reverse().slice(0, limit);
}

export async function getSubmission(id: string): Promise<Submission | undefined> {
  const db = await getDB();
  return db.get("submissions", id);
}

export async function deleteSubmission(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("submissions", id);
}

export async function clearSubmissions(): Promise<void> {
  const db = await getDB();
  await db.clear("submissions");
}
