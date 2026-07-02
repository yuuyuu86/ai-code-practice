import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
