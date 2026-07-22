import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // アプリと同じ "@/..." のパス指定をテストからも使えるようにする
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    // ブラウザAPIに依存しない純粋ロジックだけを対象にする
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
