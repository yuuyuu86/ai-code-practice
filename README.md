# AIコード練習 (ai-code-practice)

ブラウザ内で問題の生成・実行・採点・レビューまで完結する初心者向けプログラミング練習サイトです。**外部LLM APIは一切使いません(API料金ゼロ)。**

## 公開URL

**https://yuuyuu86.github.io/ai-code-practice/**

`main` に push すると GitHub Actions が自動でデプロイします。

## 2つのモード

画面左上のタブで切り替えます。AIモデルは両モードで共有され、先に使ったほうで読み込まれます。

| | AI生成モード | 教材モード(100本ノック) |
|---|---|---|
| 問題 | WebLLMがその場で生成 | 担当教員の教材100問(C言語) |
| 言語 | C / Python / JavaScript / TypeScript / SQL / HTML+CSS+JS | C のみ |
| 入力 | 生成されたテストケース | 標準入力欄に自分で入力(試し実行用) |
| 採点 | Judge Engine (AC/WA/CE/RE/TLE/OLE) | 全テストケースで合否判定 |
| レビュー | AI(結果/原因/直す方向/次の一手) | 同左 |

教材の出典: [marugotoyusuke/Knock100](https://github.com/marugotoyusuke/Knock100) (作者の許諾を得て収録)

## 動かし方

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

- **推奨ブラウザ: Chrome / Edge**。AI生成にはWebGPU、C言語の実行にはSharedArrayBufferが必要です。
- 初回はAIモデル(約700MB)とCコンパイラ(clang, 数十MB)のダウンロードが走ります。2回目以降はブラウザキャッシュから読み込みます。

検証コマンド:

```bash
npm test          # vitest(判定ロジックと教材データの整合性)
npm run lint      # ESLint
npx tsc --noEmit  # typecheck
npm run build     # 本番ビルド
```

CIでも同じ検証を通してからデプロイします。

## アーキテクチャ

### AI生成モード
```
言語・難易度・単元を選ぶ
→ WebLLM(ブラウザ内)で問題を生成(骨格→詳細→模範解答の3段階)
→ Validatorで構造チェック
→ referenceSolutions.pythonをPyodideで実行してexpectedを生成(AIのexpectedは信用しない)
→ Monaco Editorでコードを書く
→ 言語別Runner(Web Worker / Pyodide / Clang WASM)で実行
→ Judge EngineがAC/WA/CE/RE/TLE/OLEを判定(判定はAIに任せない)
→ 機械レビュー + AIレビュー
→ IndexedDBに履歴保存、クリックで復元
```

### 教材モード
```
単元で絞る or ランダム出題 or 一覧から選ぶ
→ Cでコードを書く(標準入力欄で自分の入力を試せる)
→ 用意した全テストケースで採点(入力欄の値ではない)
   ├ 93問: 提出コードと模範解答を同じ入力で実行して出力比較
   └ 6問: 出力比較できないので性質チェック(乱数・自由記述)
→ 「N件中M件合格」と失敗ケース(入力/期待/実際)を表示
→ AIレビュー(判定は覆させない)
→ IndexedDBに履歴保存
```

**なぜ1件でなく全ケースで採点するか**: 入力欄の1件だけで判定すると、答えをベタ書きしたコード(`printf("8")`)も正解になってしまうためです。

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
- **model_id**(`src/lib/ai/webllmClient.ts`):
  - 第一候補: `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`
  - 読み込み失敗時の予備: `Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC`
  - (当初は Llama-3.2-1B を第一候補にしていたが、見出し付き構造化出力の追従が弱く崩れやすいため変更)
- モデルはモジュールレベルでキャッシュされ、**AI生成モードと教材モードで共有**される。先に使ったほうで読み込まれ、進捗%をUIに表示。
- 生成は3段階(骨格 → 制約・入力例 → 模範解答)。各段で検証し、失敗したら**失敗理由をプロンプトに渡して最大5回再生成**。
- 小型モデル対策として、タイトルの英語ラベル("Advanced Level:" 等)は拒否ではなく**自動で除去**する。拒否だけだと同じ失敗を繰り返して試行回数を使い切るため。
- 検証を通過した問題は `cachedAIProblems` にキャッシュ。

### フォールバック(テンプレ問題は使わない)

WebGPUが使えない/モデル読み込み失敗時:
1. IndexedDBの `cachedAIProblems` から探す(完全一致 → 同言語・同単元 → 同言語の順)
2. あればそれを出題(「AI生成(キャッシュ)」ラベル付き)
3. なければ「この端末ではAI問題生成をまだ利用できません…」と表示

## 教材ソース(AI生成モード)

左パネルの「教材」から、授業資料を登録できます(`.txt` / `.md` / `.pdf`、または本文の貼り付け)。PDFはpdf.jsで本文だけ抜き出します(スキャン画像のPDFは対象外)。

登録した教材は見出し・段落を手がかりに約700文字ごとのチャンクに分割し、キーワードから単元タグをつけて `sourceChunks` に保存します。問題生成時は**選んだ単元に合うチャンクだけ**を最大1,400文字まで集めてプロンプトに渡します(`buildSourceContext`)。合うチャンクが無ければ教材を使いません — 無関係な抜粋を渡すと問題の質が落ちるためです。

教材の文章をそのまま出題しないようプロンプトで指示しています。保存先は端末内のIndexedDBのみで、外部には送りません。

## Runner

共通インターフェース `LanguageRunner`(`src/lib/runners/types.ts`)。言語追加は Runner実装 + `runnerManager` に1行 + `languages.ts` + 補完スニペット追加のみ。

| 言語 | 方式 | stdin | stdout |
|---|---|---|---|
| JavaScript | Web Worker(無限ループでもUIが固まらない) | グローバル `input` / `readLine()` | `console.log` フック |
| TypeScript | Monaco同梱のTSコンパイラで型チェック→JSに変換し、JavaScript Runnerで実行 | JavaScriptと同じ | JavaScriptと同じ |
| Python | Pyodide 0.26.4(CDN、Worker内) | `input()` を差し替え | `sys.stdout` 差し替え |
| C | Wasmer JS SDK 0.10.0 + `clang/clang` パッケージ(実装・検証済み) | WASI stdin | WASI stdout/stderr |
| SQL | SQLite(sql.js / WASM、Worker内) | 標準入力は無い。テーブル定義とデータ投入SQLを渡す | SELECT結果のタブ区切り(1行目が列名) |
| HTML/CSS/JS | サンドボックスiframeで描画 | 標準入力は無い。DOMのチェック1件を渡す | チェックの結果(合格なら説明文、不合格なら実際の値) |

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
- **最適化**: 同一コードの `.wasm` をキャッシュする。教材モードの採点では「提出コード」と「模範解答」を交互に実行するため、**キャッシュは複数件(LRU)持つ**。1件だけだと必ず取り合って再コンパイルになる。
- **前提**: `SharedArrayBuffer` 必須 → COOP(same-origin)/COEP(credentialless)が要る。
  - ローカル: `next.config.ts` の `headers()` が付ける
  - GitHub Pages: 静的ホスティングではヘッダーを設定できないため、**Service Worker(`public/coi-serviceworker.js`)がレスポンスに付け直す**
  - Chrome/Edge系で動作。**FirefoxはCOEP credentiallessが弱く、C実行のみ不可**(Python/JS/問題生成は動く)
- **差し替え**: `LanguageRunner` インターフェースは不変なので、別のClang/WASI実装へ移す場合も `cRunner.ts` の中身だけ変更すればよい。

## 教材モードの採点

`src/lib/knock/knockJudge.ts` が全テストケースで採点する。

| 方法 | 問題数 | 内容 |
|---|---|---|
| 出力比較 | 93問 | `src/data/knockTests.ts` の入力(計237ケース)で提出コードと模範解答を実行して比較 |
| 性質チェック | 6問 | `src/data/knockChecks.ts`。乱数(96-99)や自由記述(2,3)は出力比較できないので、出力が満たすべき性質を検証 |
| 自動採点しない | 1問 | No.39 のみ。模範解答が何も出力しない問題のため、出力から正誤を区別できない |

- テスト入力は全ケース、ローカルのgccで模範解答を実行して異常終了・タイムアウトが無いことを検証済み。
- **出力形式の補足**(`src/data/knockOutputSpecs.ts`): 問題文に書かれていない文字列を模範解答が出力する問題(例: No.90 は問題文が「春」なのに模範解答は `spring`)は、そのままだと正しい解答が不正解になる。採点に合わせるべき形式を画面に表示して回避している。**元教材の問題文は変更していない。**

## Judge Engine

- テストケースを順番に実行し、最初に失敗した1ケースだけ表示(「追加チェックで失敗しました」等のやわらかい表現)。
- 出力比較は行末空白・末尾空行を無視(初心者向けに寛容)。
- ステータス: AC(緑)/ WA(赤)/ CE(オレンジ)/ RE / TLE / OLE。
- **正誤判定は必ずJudge Engineが行い、AIはレビュー文生成のみ。**

## レビュー(2層)

1. **機械レビュー**: 判定結果・落ちたケース・期待/実際の出力・エラー内容(常に生成可能)
2. **AIレビュー**: WebLLMで「結果 / 原因 / 直す方向 / 次の一手」の4項目固定。AI失敗時は機械レビューにフォールバック。

## SQL問題の採点

SQLは標準入出力が無いので、採点の形が他言語と違います。

- **テストケース = データセット**。`tests[i].input` にテーブル定義とデータ投入SQLが入り、テストごとに違うデータを入れます。データが1種類だと結果を直接書いたSELECTでも通ってしまうため、3件以上を必須にしています。
- **答え = SELECTの結果**。1行目が列名、2行目以降が値のタブ区切りテキストになり、既存の出力比較にそのまま乗ります。
- **ORDER BY必須**。SQLiteはORDER BYが無いと行の順序を保証しないので、模範解答にORDER BYが無い問題は生成時に弾きます。
- 結果セットの読み出しには `exec()` ではなく `prepare()` を使います。`exec()` は「0行のSELECT」と「SELECTでない文」をどちらも空配列で返すため、1件も該当しないデータのときINSERTしか書いていない答えまで正解になってしまいます。
- 期待する出力はAIに書かせず、模範解答のSELECTをsql.jsで実行して作ります(他言語のPyodideと同じ方針)。全データで同じ結果になる問題も弾きます。

SQL問題は `supportedLanguages: ["sql"]` を持ち、他の言語を選んだ状態では実行できません(逆も同じ)。

## HTML+CSS+JS問題の採点

このモードには「出力」がありません。書いたページを実際に描画して、DOMを1項目ずつ調べます。

- **テストケース = チェック1件**。`exists` / `count` / `text` / `attr` / `style` の5種類だけを使い、`種類|セレクタ|…|説明` の1行で表します。種類を絞ることで、小型モデルでも形を守れて、こちらでも妥当性を検証できます。
- **期待値 = チェックの説明文**。合格したRunnerも同じ説明文を返すので、結果画面の「期待する出力 / あなたの出力」が日本語で読めます(例: 期待「リスト項目(li)が3つある」/ 実際「2個でした」)。
- **空のページで全部通るチェックは弾く**。通ってしまうと、何も書かない答えが正解になります。模範解答のHTMLで全チェックが通ることもあわせて確認します。
- 色は `red` と `#0000ff` のような書き方の違いを吸収するため、一度ブラウザに解釈させてから比べます。
- JavaScriptで組み立てたDOMも採点対象です。

描画には `sandbox="allow-scripts"` のiframeを使い、**`allow-same-origin` は付けません**。付けると提出コードからこのアプリのIndexedDBやlocalStorageに触れてしまうためです。代わりに調べる処理自体をiframeの中に入れ、結果だけを `postMessage` で受け取ります(iframeのoriginは `null` になり、ストレージへのアクセスはSecurityErrorになることを確認済み)。

なお、このiframeは画面外に置くため `requestAnimationFrame` は発火しません。待ち合わせには `setTimeout` を使っています(`getComputedStyle` は描画されていなくても正しい値を返します)。

## 保存(IndexedDB / ログイン不要)

ストア: `generatedProblems` / `cachedAIProblems` / `submissions` / `knockSubmissions` / `codeDrafts` / `settings` / `sources` / `sourceChunks`。

履歴クリックで過去のコード・結果・レビュー・問題を復元できます。コードは問題×言語ごとに自動下書き保存(800msデバウンス)。

## 将来拡張への備え(実装済みの設計)

- `generateProblem` は `sourceContext?: string` を受け取れる(教材ソースのアップロードUIから供給)
- Problem JSONに `sourceRefs` / `learningObjectives` を持てる
- 言語追加はRunner差し替えのみ(`registerRunner`)

## 既知の制限・未実装

### 原理的な制限
- **No.39 は自動採点できない**。模範解答が何も出力しない問題のため、出力からは正誤を区別できない(何もしないプログラムも通ってしまう)。画面に理由を明示している。
- **小型モデル(1.5B)の限界**: 問題生成は最大5回リトライしても失敗することがある。その場合は条件(単元・難易度)を変えて再試行する。AIレビューの精度もモデル依存。
- **Firefoxでは C 実行が使えない**(COEP credentialless 非対応)。他の機能は動く。
- **スキャン画像のPDFは教材に取り込めない**。pdf.jsは文字を持つPDFからしか本文を取り出せない。テキストを貼り付けて登録する。
- SQL・HTMLの問題生成も1.5Bモデル頼りで、検証(ORDER BY必須、空ページで通らない、等)に通らなければ最大5回で打ち切る。

### 未実装
現時点では無し。上に挙げたのはいずれも原理的な制限で、実装で解消できるものではない。

### テスト
`npm test`(vitest)の対象:

- 判定ロジック(`compareOutput`)・性質チェック・教材100問のデータ整合性
- 言語設定の配線(言語を足したときの付け忘れ防止)、教材チャンク分割、SQL問題とHTMLチェックの構造検証
- IndexedDB越しの保存処理(`fake-indexeddb`。ストア定義・マイグレーション・インデックスまで本物と同じ経路を通る)
- UIコンポーネント(jsdom + Testing Library)。ファイル先頭に `// @vitest-environment jsdom` を書いたテストだけがjsdomで動く(純粋ロジックのテストを遅くしないため)

実ブラウザでしか動かない処理(各Runnerの実行系・WebLLM)はテスト対象外で、ブラウザでの確認に頼っている。
