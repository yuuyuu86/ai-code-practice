import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // アプリと同じ "@/..." のパス指定をテストからも使えるようにする
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // 既定はNode。ブラウザAPIが要るテストだけ、ファイル先頭の
    // "// @vitest-environment jsdom" で切り替える。
    // 全体をjsdomにすると、純粋ロジックのテストまで遅くなるため。
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
