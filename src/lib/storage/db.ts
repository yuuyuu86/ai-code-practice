import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Problem, Source, SourceChunk } from "@/types/problem";
import type { KnockSubmission, Submission } from "@/types/submission";

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
  /** 教材モード(100本ノック)の提出履歴。合否判定が無いのでsubmissionsとは別ストア */
  knockSubmissions: {
    key: string;
    value: KnockSubmission;
    indexes: { "by-createdAt": string };
  };
  codeDrafts: {
    key: string; // `${problemId}:${language}`
    value: { key: string; problemId: string; language: string; code: string; updatedAt: string };
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
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      // バージョンごとに差分だけ適用する。既存ユーザー(oldVersion=1)で
      // v1のストアを作り直そうとすると "store already exists" で失敗するため、
      // 必ず oldVersion で分岐すること。
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const problems = db.createObjectStore("generatedProblems", { keyPath: "id" });
          problems.createIndex("by-createdAt", "createdAt");

          const cached = db.createObjectStore("cachedAIProblems", { keyPath: "id" });
          cached.createIndex("by-cacheKey", "cacheKey");

          const subs = db.createObjectStore("submissions", { keyPath: "id" });
          subs.createIndex("by-createdAt", "createdAt");

          db.createObjectStore("codeDrafts", { keyPath: "key" });
          db.createObjectStore("settings", { keyPath: "key" });

          db.createObjectStore("sources", { keyPath: "id" });
          const chunks = db.createObjectStore("sourceChunks", { keyPath: "id" });
          chunks.createIndex("by-sourceId", "sourceId");
        }
        if (oldVersion < 2) {
          const knockSubs = db.createObjectStore("knockSubmissions", { keyPath: "id" });
          knockSubs.createIndex("by-createdAt", "createdAt");
        }
        if (oldVersion < 3) {
          // v2以前は reviews ストアを作っていたが、一度も使わなかった
          // (レビューは submissions に埋め込み保存している)。
          // 使っていないスキーマが残ると読む人を混乱させるので、既存ユーザーからは削除する。
          // 型定義からは外したので、削除するだけのここでは緩い型に落として扱う。
          const legacy = db as unknown as IDBDatabase;
          if (legacy.objectStoreNames.contains("reviews")) legacy.deleteObjectStore("reviews");
        }
      },
    });
  }
  return dbPromise;
}
