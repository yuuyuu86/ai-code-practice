import type { Wasmer as WasmerClass, Directory as DirectoryClass } from "@wasmer/sdk";
import type { LanguageRunner, RunnerResult, RunParams } from "./types";

/**
 * C Runner (Clang系WASM)。
 *
 * 方式(Node環境で実測して確定した手順):
 *   1. @wasmer/sdk を init()
 *   2. Wasmer.fromRegistry("clang/clang") で clang パッケージを取得(初回は数十MBのDL)
 *   3. Directory に main.c を書き、clang.entrypoint.run() で wasm32-wasi の main.wasm にコンパイル
 *   4. Wasmer.fromWasm(main.wasm).entrypoint.run({ stdin }) で実行し stdout/stderr を取得
 *
 * 検証メモ: `2つの数の和`(scanfで2整数→printfで合計)を上記手順で
 *   コンパイル→実行し、stdin "3 5" に対して stdout "8" を得ることを Node 上で確認済み。
 *   ※ runWasix(module) はワーカー間の module シリアライズに失敗する環境があるため使わず、
 *     bytes を渡す fromWasm 経由に統一している。
 *
 * 注意:
 * - SharedArrayBuffer が必要 → COOP/COEP ヘッダー(next.config.ts で設定済み)必須。
 *   非対応ブラウザ(例: Firefox の COEP credentialless 非対応)では利用不可になるだけで、
 *   他機能(Python/JS/問題生成)はそのまま動く。
 * - SDKはブラウザではCDNから動的import(バンドラのワーカー解決問題を避けるため)。
 *   別のClang/WASI実装へ差し替える場合も、このファイルの中身だけ変えればよい
 *   (LanguageRunner インターフェースは不変)。
 *
 * 判定マッピング:
 * - コンパイル失敗 → compile-error (CE)
 * - 実行時の非0終了/トラップ → runtime-error (RE)
 * - タイムアウト → timeout (TLE)
 * - 出力過多 → output-limit (OLE)
 */

// 型は実パッケージ(@wasmer/sdk)から取得。実行時はCDNからロードする。
type WasmerStatics = {
  fromRegistry: (specifier: string) => Promise<WasmerClass>;
  fromWasm: (binary: Uint8Array) => WasmerClass;
};
type SDK = {
  init: (options?: unknown) => Promise<unknown>;
  Wasmer: WasmerStatics;
  Directory: new () => DirectoryClass;
};

// npm版と同じバージョンをCDNから。型検証は node_modules の 0.10.0 に対して実施済み。
const WASMER_CDN_URL = "https://unpkg.com/@wasmer/sdk@0.10.0/dist/index.mjs";
const CLANG_PACKAGE = "clang/clang";

let sdkPromise: Promise<SDK | null> | null = null;
let clangPromise: Promise<WasmerClass> | null = null;

async function loadSDK(): Promise<SDK | null> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      try {
        if (typeof SharedArrayBuffer === "undefined") {
          console.warn("[cRunner] SharedArrayBufferが無いためWasmer SDKを初期化できません(COOP/COEPヘッダーを確認)");
          return null;
        }
        // バンドラに解決させずCDNから読み込む
        const sdk = (await import(/* webpackIgnore: true */ /* @vite-ignore */ WASMER_CDN_URL)) as unknown as SDK;
        await sdk.init();
        return sdk;
      } catch (err) {
        console.warn("[cRunner] Wasmer SDKの読み込みに失敗:", err);
        return null;
      }
    })();
  }
  return sdkPromise;
}

async function loadClang(sdk: SDK): Promise<WasmerClass> {
  if (!clangPromise) {
    clangPromise = sdk.Wasmer.fromRegistry(CLANG_PACKAGE).catch((err: unknown) => {
      clangPromise = null; // 失敗したら次回リトライできるように
      throw err;
    });
  }
  return clangPromise;
}

// Judgeは同じコードを全テストケース分だけ run() する。毎回コンパイルすると遅いので、
// 直近にコンパイルしたコードの .wasm をキャッシュして使い回す。
let compileCache: { code: string; wasm: Uint8Array } | null = null;

/** コンパイル成功なら wasm を、失敗なら CE 結果を返す */
async function compile(sdk: SDK, code: string): Promise<{ ok: true; wasm: Uint8Array } | { ok: false; stderr: string }> {
  if (compileCache && compileCache.code === code) {
    return { ok: true, wasm: compileCache.wasm };
  }
  const clang = await loadClang(sdk);
  const project = new sdk.Directory();
  await project.writeFile("main.c", code);
  const compileInstance = await clang.entrypoint!.run({
    args: ["/project/main.c", "-o", "/project/main.wasm"],
    mount: { "/project": project },
  });
  const compileResult = await compileInstance.wait();
  if (!compileResult.ok) {
    return { ok: false, stderr: cleanupClangError(compileResult.stderr) || "コンパイルに失敗しました" };
  }
  const wasm = await project.readFile("main.wasm");
  compileCache = { code, wasm };
  return { ok: true, wasm };
}

async function runC({ code, input, timeoutMs, outputLimit }: RunParams): Promise<RunnerResult> {
  const started = performance.now();
  const sdk = await loadSDK();
  if (!sdk) {
    return {
      type: "compile-error",
      stdout: "",
      stderr:
        "この端末ではC言語の実行環境(Clang WASM)を初期化できませんでした。Chrome系の最新ブラウザで、ページを再読み込みして試してみてください。",
      elapsedMs: performance.now() - started,
    };
  }

  // --- コンパイル(初回はclang本体のDLを含むため、タイムアウトは適用しない。結果はキャッシュ)---
  let wasm: Uint8Array;
  try {
    const compiled = await compile(sdk, code);
    if (!compiled.ok) {
      return { type: "compile-error", stdout: "", stderr: compiled.stderr, elapsedMs: performance.now() - started };
    }
    wasm = compiled.wasm;
  } catch (err) {
    return {
      type: "compile-error",
      stdout: "",
      stderr: `Cのコンパイル準備でエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
      elapsedMs: performance.now() - started,
    };
  }

  // --- 実行(タイムアウトはここにのみ適用)---
  const runStarted = performance.now();
  try {
    const program = sdk.Wasmer.fromWasm(wasm);
    const instance = await program.entrypoint!.run({ stdin: input });

    const TIMEOUT = Symbol("timeout");
    const result = await Promise.race([
      instance.wait(),
      new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), timeoutMs)),
    ]);

    if (result === TIMEOUT) {
      try {
        instance.free();
      } catch {
        /* noop */
      }
      return { type: "timeout", stdout: "", stderr: "", elapsedMs: performance.now() - runStarted };
    }

    const stdout = result.stdout ?? "";
    if (stdout.length > outputLimit) {
      return {
        type: "output-limit",
        stdout: stdout.slice(0, outputLimit),
        stderr: "",
        elapsedMs: performance.now() - runStarted,
      };
    }
    if (!result.ok) {
      return {
        type: "runtime-error",
        stdout,
        stderr: result.stderr || `プログラムが異常終了しました (exit code: ${result.code})`,
        elapsedMs: performance.now() - runStarted,
      };
    }
    return { type: "success", stdout, stderr: result.stderr ?? "", elapsedMs: performance.now() - runStarted };
  } catch (err) {
    return {
      type: "runtime-error",
      stdout: "",
      stderr: `C実行中にエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
      elapsedMs: performance.now() - runStarted,
    };
  }
}

/** clangのエラーメッセージから内部パス等のノイズを軽く落とす */
function cleanupClangError(stderr: string): string {
  return stderr.replace(/\/project\//g, "").trim();
}

export const cRunner: LanguageRunner = {
  language: "c",
  isAvailable: async () => {
    if (typeof SharedArrayBuffer === "undefined") return false;
    return (await loadSDK()) !== null;
  },
  run: runC,
  // 事前にSDKとclangを読み込んでおくと、初回実行が速くなる
  warmup: async () => {
    const sdk = await loadSDK();
    if (sdk) await loadClang(sdk);
  },
};
