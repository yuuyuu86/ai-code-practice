# AIコード練習 (ai-code-practice)

ブラウザ内AIがプログラミング問題を生成し、ブラウザ内で実行・判定・レビューまで完結する初心者向け練習サイトです。**外部LLM APIは一切使いません(API料金ゼロ)。**

## 動かし方

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

- **推奨ブラウザ: Chrome / Edge(WebGPU対応版)**。AI問題生成はWebGPUを使います。
- 初回の「問題を生成」ではAIモデル(約700MB)のダウンロードが走るため数分かかります。2回目以降はブラウザキャッシュから読み込みます。

検証コマンド:

```bash
npm run lint   # ESLint
npx tsc --noEmit  # typecheck
npm run build  # 本番ビルド(typecheck込み)
```

いずれも通過済み(Next.js 16 / Turbopack)。

## アーキテクチャ

```
言語・難易度・単元を選ぶ
→ WebLLM(ブラウザ内)でProblem JSONを生成
→ Validatorで構造チェック
→ referenceSolutions.pythonをPyodideで実行してexpectedを生成(AIのexpectedは信用しない)
→ Monaco Editorでコードを書く
→ 言語別Runner(Web Worker / Pyodide / Clang WASM)で実行
→ Judge EngineがAC/WA/CE/RE/TLE/OLEを判定(判定はAIに任せない)
→ 機械レビュー + AIレビュー(結果/原因/直す方向/次の一手)
→ IndexedDBに履歴保存、クリックで復元
```

### ディレクトリ

```
src/
  app/page.tsx                     エントリ
  components/
    layout/   AppShell(状態管理の中心) / LeftPanel / EditorPanel / HistorySidebar
    problem/  ProblemControls / ProblemCard / HintBox(3段階ヒント)
    editor/   CodeEditor(Monaco) / CompletionProvider
    result/   RunResult / ReviewPanel / StatusBadge
    history/  HistoryList
  lib/
    ai/       webllmClient / generateProblem(3回リトライ) / generateReview / prompts
    problem/  schema(JSON抽出) / validateProblem / buildTests(expected生成)
    runners/  types(LanguageRunner IF) / runnerManager / javascriptRunner / pythonRunner / cRunner
    judge/    judge / compareOutput / status
    storage/  db(idb) / problems / submissions / drafts / settings
    editor/   completions(補完スニペット定義)
    languages.ts  言語config(追加時はここ+Runner+スニペット)
  types/      problem / judge / submission
```

## AI問題生成(WebLLM)

- ライブラリ: `@mlc-ai/web-llm` v0.2.84
- **model_id確認済み**(`prebuiltAppConfig.model_list`をnode_modules内で確認):
  - 第一候補: `Llama-3.2-1B-Instruct-q4f16_1-MLC`
  - 読み込み失敗時の予備: `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`
- モデル読み込みは「問題を生成」ボタン押下時に開始。進捗%をUIに表示。
- 生成 → JSON抽出 → 構造Validator → Pyodideで模範解答実行&expected生成 → サンプル出力との一致検証。失敗したら**失敗理由をプロンプトに渡して最大3回再生成**。
- 検証を通過した問題は `cachedAIProblems` にキャッシュ。

### フォールバック(テンプレ問題は使わない)

WebGPUが使えない/モデル読み込み失敗時:
1. IndexedDBの `cachedAIProblems` から探す(完全一致 → 同言語・同単元 → 同言語の順)
2. あればそれを出題(「AI生成(キャッシュ)」ラベル付き)
3. なければ「この端末ではAI問題生成をまだ利用できません…」と表示

## Runner

共通インターフェース `LanguageRunner`(`src/lib/runners/types.ts`)。言語追加は Runner実装 + `runnerManager` に1行 + `languages.ts` + 補完スニペット追加のみ。

| 言語 | 方式 | stdin | stdout |
|---|---|---|---|
| JavaScript | Web Worker(無限ループでもUIが固まらない) | グローバル `input` / `readLine()` | `console.log` フック |
| Python | Pyodide 0.26.4(CDN、Worker内) | `input()` を差し替え | `sys.stdout` 差し替え |
| C | Wasmer JS SDK 0.10.0 + `clang/clang` パッケージ(実装・検証済み) | WASI stdin | WASI stdout/stderr |

共通制限: タイムアウト2秒 / 出力10,000文字(OLE) / 入力10KB。

### C Runner(Clang系WASM)の実装状況 【実装・検証済み】

- **構成**: `@wasmer/sdk` 0.10.0 + Wasmerレジストリの `clang/clang` パッケージ。
  1. `init()` → `Wasmer.fromRegistry("clang/clang")`(初回のみ数十MBのDL、以降キャッシュ)
  2. `Directory` に `main.c` を書き、`clang.entrypoint.run({ args:["/project/main.c","-o","/project/main.wasm"], mount:{"/project":dir} })` で wasm32-wasi にコンパイル
  3. `Wasmer.fromWasm(main.wasm).entrypoint.run({ stdin })` で実行し stdout/stderr/exit code を取得
- **検証結果(Node 上で `@wasmer/sdk/node` を使って実測)**:
  - `2つの数の和`(scanfで2整数→printf合計)を コンパイル→実行 → stdin `"3 5"` に対し stdout `"8"` を取得 ✅
  - 構文エラーのCコード → `ok:false` + 行番号付きエラー(`main.c:2:26: error: expected ';' ...`)→ **CE** として表示 ✅
  - stdin の受け渡し・stdout/stderr の取得 ✅
  - ブラウザとの差異: `runWasix(module)` はワーカー間の module シリアライズに失敗する環境があるため使わず、bytes を渡す **`fromWasm` 経由**に統一(ブラウザ/Nodeの両方で動く)。
- **判定マッピング**: コンパイル失敗→CE / 非0終了・トラップ→RE / 2秒超過→TLE / 出力過多→OLE。
- **最適化**: Judgeはテストケース分だけ `run()` を呼ぶため、同一コードの `.wasm` を `cRunner.ts` 内でキャッシュし、2回目以降はコンパイルを省いて実行のみ。
- **前提**: `SharedArrayBuffer` 必須 → `next.config.ts` でCOOP(same-origin)/COEP(credentialless)を設定済み。Chrome/Edge系で動作。**FirefoxはCOEP credentiallessが弱く、C実行のみ不可**(Python/JS/問題生成は動く)。初回はclangのDLで時間がかかる(UIに「初回はCコンパイラの準備に時間がかかります」と表示)。
- **差し替え**: `LanguageRunner` インターフェースは不変なので、別のClang/WASI実装へ移す場合も `cRunner.ts` の中身だけ変更すればよい。

## Judge Engine

- テストケースを順番に実行し、最初に失敗した1ケースだけ表示(「追加チェックで失敗しました」等のやわらかい表現)。
- 出力比較は行末空白・末尾空行を無視(初心者向けに寛容)。
- ステータス: AC(緑)/ WA(赤)/ CE(オレンジ)/ RE / TLE / OLE。
- **正誤判定は必ずJudge Engineが行い、AIはレビュー文生成のみ。**

## レビュー(2層)

1. **機械レビュー**: 判定結果・落ちたケース・期待/実際の出力・エラー内容(常に生成可能)
2. **AIレビュー**: WebLLMで「結果 / 原因 / 直す方向 / 次の一手」の4項目固定。AI失敗時は機械レビューにフォールバック。

## 保存(IndexedDB / ログイン不要)

ストア: `generatedProblems` / `cachedAIProblems` / `submissions` / `codeDrafts` / `reviews` / `settings` / `sources` / `sourceChunks`(最後の2つはPhase 2教材ソース用に確保済み、UI未実装)。

履歴クリックで過去のコード・結果・レビュー・問題を復元できます。コードは問題×言語ごとに自動下書き保存(800msデバウンス)。

## 将来拡張への備え(実装済みの設計)

- `generateProblem` は `sourceContext?: string` を受け取れる(教材ソース対応の土台)
- Problem JSONに `sourceRefs` / `learningObjectives` を持てる
- 言語追加はRunner差し替えのみ(`registerRunner`)
- 未対応言語(TypeScript / SQL / HTML/CSS/JS)はセレクタに「準備中」表示

## 未実装・要確認事項

- **C実行**: 実装・検証済み(Nodeでコンパイル/実行/CEを実測)。実ブラウザでの初回clang DL(数十MB)は環境依存で時間がかかる点に留意。
- HTML/CSS/JSのiframeプレビュー(MVP対象外、未着手)
- 教材ソースアップロードUI(Phase 2。ストアと型・生成関数の口は用意済み)
- 軽量モデル(Llama 3.2 1B)はJSON出力の安定性に限界があるため、生成に3回失敗することがある。その場合は条件(単元・難易度)を変えて再試行してください。より安定させたい場合は `webllmClient.ts` の `PRIMARY_MODEL_ID` を `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` などに変更。
- レビュー用 `reviews` ストアは確保済みだが、現状レビューは `submissions` 内に埋め込み保存している(将来レビュー再生成機能を作るときに分離予定)。
