# 収録している第三者の教材について

## 基礎プロ 100本ノック

このアプリの「教材(100本ノック)」モードで出題している100問は、次の教材を**原文のまま**収録したものです。

- 作者: marugotoyusuke (Yusuke Kobayashi) 氏
- サイト: https://marugotoyusuke.github.io/Knock100/
- リポジトリ: https://github.com/marugotoyusuke/Knock100

**著作権は作者に帰属します。** 本リポジトリの作者(yuuyuu86)は担当教員である作者本人から
収録の許諾を得ています。この許諾は本リポジトリに対するものであり、**第三者への再配布を
認めるものではありません。**

元教材のリポジトリにはライセンスが設定されていないため、既定では著作権法上の
全権利が作者に留保されています。このアプリをフォーク・改変・再配布する場合は、
`src/data/knock100.ts` と `src/data/knockOutputSpecs.ts` を取り除くか、
作者から別途許諾を得てください。

該当ファイル:

- `src/data/knock100.ts` — 100問の問題文と模範解答
- `src/data/knockOutputSpecs.ts` — 出力形式の補足(こちらは本リポジトリ側で書き足したもの)
- `src/data/knockTests.ts` / `src/data/knockChecks.ts` — 自動採点用のテスト入力(本リポジトリ側で作成)

## その他の依存物

同梱している以下のファイルは、それぞれのライセンスに従います。

- `public/sqljs/sql-wasm.js` / `public/sqljs/sql-wasm.wasm` — [sql.js](https://github.com/sql-js/sql.js) (MIT)
- `public/coi-serviceworker.js` — [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) (MIT)
