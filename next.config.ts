import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ワークスペースのルートをこのプロジェクトに固定する。
  // 指定しないと親ディレクトリ(例: ~/package-lock.json)を検出して
  // Turbopackがルートを ~/ に誤推論し、ホーム全体を監視 → 内部エラーで
  // FSキャッシュ破棄や code-frame ハイライタのパニック(日本語のマルチバイト
  // 境界でクラッシュ)を起こすことがある。
  // npm run dev / build はプロジェクトルートで実行されるため cwd で固定できる。
  turbopack: {
    root: process.cwd(),
  },
  // Wasmer SDK(C Runner)がSharedArrayBufferを必要とするため、
  // COOP/COEPヘッダーを設定してcross-origin isolationを有効にする。
  // COEPは"credentialless"にして、Pyodide/WebLLMのCDN読み込みを妨げないようにする
  // (Chromium系で対応。非対応ブラウザではC Runnerが利用不可になるだけで、他機能は動く)。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
