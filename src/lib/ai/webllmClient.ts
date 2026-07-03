import type { MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

/**
 * WebLLM クライアント。
 * モデルはブラウザ内(WebGPU)で動作し、外部APIは使わない。
 *
 * 【model_id 確認メモ】
 * @mlc-ai/web-llm v0.2.84 の prebuiltAppConfig.model_list を確認済み。
 * 以下のmodel_idが利用可能(node_modules内のconfigで確認):
 *   - "Qwen2.5-3B-Instruct-q4f16_1-MLC"  ← 第一候補(難易度高めでも構造維持しやすい)
 *   - "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" ← 予備(3Bより軽い)
 *   - "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC" ← コード重視の代替
 *   - "Llama-3.2-1B-Instruct-q4f16_1-MLC"  ← より軽いが指示追従が弱く、構造化出力を崩しやすい
 *   - "gemma3-1b-it-q4f16_1-MLC"
 *
 * 【モデル選定の経緯】当初 Llama-3.2-1B を第一候補にしたが、
 * セクション形式(見出し付き問題+Python模範解答)の生成で見出しの取り違えや
 * 必須セクションの欠落が頻発したため、より強い Qwen2.5 系を優先して使う。
 */
export const PRIMARY_MODEL_ID = "Qwen2.5-3B-Instruct-q4f16_1-MLC";
export const FALLBACK_MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export type LoadProgress = {
  text: string;
  progress: number; // 0..1
};

let enginePromise: Promise<MLCEngine> | null = null;
let loadedModelId: string | null = null;

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/**
 * WebLLMエンジンを取得する(初回呼び出し時にモデル読み込みを開始)。
 * 「問題を生成」ボタンを押したタイミングで呼ばれる想定。
 */
export async function getEngine(onProgress?: (p: LoadProgress) => void): Promise<MLCEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      if (!isWebGPUAvailable()) {
        throw new WebLLMUnavailableError("このブラウザはWebGPUに対応していません");
      }
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const initProgressCallback = (report: InitProgressReport) => {
        onProgress?.({ text: report.text, progress: report.progress });
      };
      try {
        return await CreateMLCEngine(PRIMARY_MODEL_ID, { initProgressCallback });
      } catch (err) {
        console.warn(`[webllm] ${PRIMARY_MODEL_ID} の読み込みに失敗。${FALLBACK_MODEL_ID} を試します:`, err);
        const engine = await CreateMLCEngine(FALLBACK_MODEL_ID, { initProgressCallback });
        loadedModelId = FALLBACK_MODEL_ID;
        return engine;
      }
    })();
    enginePromise
      .then(() => {
        if (!loadedModelId) loadedModelId = PRIMARY_MODEL_ID;
      })
      .catch(() => {
        enginePromise = null; // 失敗したら次回リトライできるようにする
      });
  }
  return enginePromise;
}

export function getLoadedModelId(): string | null {
  return loadedModelId;
}

export class WebLLMUnavailableError extends Error {}

/**
 * チャット補完。
 * json:true にすると WebLLM の文法制約デコード(response_format: json_object)を使い、
 * 構文的に壊れたJSONが出ないようにする。小さいモデルでの生成成功率が大きく上がる。
 */
export async function chat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: { temperature?: number; maxTokens?: number; json?: boolean; onProgress?: (p: LoadProgress) => void },
): Promise<string> {
  const engine = await getEngine(options?.onProgress);
  const reply = await engine.chat.completions.create({
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    ...(options?.json ? { response_format: { type: "json_object" as const } } : {}),
  });
  return reply.choices[0]?.message?.content ?? "";
}
