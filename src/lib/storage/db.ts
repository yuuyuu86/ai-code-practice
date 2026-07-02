import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Problem, Source, SourceChunk } from "@/types/problem";
import type { Submission } from "@/types/submission";

interface AppDB extends DBSchema {
  /** 生成された問題(現在セッション向け) */
  generatedProblems: {
    key: string;
    value: Problem;
    indexes: { "by-createdAt": string };
  };
  /** フォールバック用: 検証を通過したAI生成問題のキャッシュ */
  cachedAIProblems: {
    key: string;
    value: Problem & { cacheKey: string };
    indexes: { "by-cacheKey": string };
  };
  submissions: {
    key: string;
    value: Submission;
    indexes: { "by-createdAt": string };
  };
  codeDrafts: {
    key: string; // `${problemId}:${language}`
    value: { key: string; problemId: string; language: string; code: string; updatedAt: string };
  };
  reviews: {
    key: string; // submissionId
    value: { submissionId: string; review: string; createdAt: string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  // Phase 2(教材ソース)用。MVPではUI未実装だがストアだけ確保しておく。
  sources: {
    key: string;
    value: Source;
  };
  sourceChunks: {
    key: string;
    value: SourceChunk;
    indexes: { "by-sourceId": string };
  };
}

const DB_NAME = "ai-code-practice";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const problems = db.createObjectStore("generatedProblems", { keyPath: "id" });
        problems.createIndex("by-createdAt", "createdAt");

        const cached = db.createObjectStore("cachedAIProblems", { keyPath: "id" });
        cached.createIndex("by-cacheKey", "cacheKey");

        const subs = db.createObjectStore("submissions", { keyPath: "id" });
        subs.createIndex("by-createdAt", "createdAt");

        db.createObjectStore("codeDrafts", { keyPath: "key" });
        db.createObjectStore("reviews", { keyPath: "submissionId" });
        db.createObjectStore("settings", { keyPath: "key" });

        db.createObjectStore("sources", { keyPath: "id" });
        const chunks = db.createObjectStore("sourceChunks", { keyPath: "id" });
        chunks.createIndex("by-sourceId", "sourceId");
      },
    });
  }
  return dbPromise;
}
