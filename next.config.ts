import type { NextConfig } from "next";

// GitHub Pages はリポジトリ名のサブパス配下(/ai-code-practice)で配信されるため、
// CIから NEXT_PUBLIC_BASE_PATH を渡してURLの基準を合わせる。
// ローカル開発では空にして http://localhost:3000/ のまま動かす。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// 静的書き出し(GitHub Pages向け)かどうか。CIでのみ有効にする。
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const, basePath, images: { unoptimized: true } } : {}),
  // ブラウザのconsoleログをdevサーバーのターミナルへ転送する機能を無効化する。
  // Next 16ではデフォルト有効('warn')だが、転送時にRust製ハイライタ
  // (next-code-frame)が該当ソース行のコードフレームを描画する際、日本語などの
  // マルチバイト文字の途中でバイト境界を切ってパニックし、devサーバーごと
  // 落ちるバグがある(16.2.10時点、Turbopack/webpack共通)。
  // このアプリはUI文言が日本語でconsole.warnも多いため、修正版が出るまで切る。
  logging: {
    browserToTerminal: false,
  },
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
