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
作者から別途許諾を得るか、**教材モードごと取り除いてください。**

第三者の著作物にあたるのは次の1ファイルだけです。

- `src/data/knock100.ts` — 100問の問題文と模範解答

ただしこのファイルを消すだけではビルドが通りません。以下が参照しているため、
教材モードをまとめて外す必要があります。

- `src/components/knock/` — 教材モードのUI一式
- `src/lib/knock/` — 出題・採点・状態管理
- `src/lib/ai/generateKnockReview.ts` — 教材モードのAIレビュー
- `src/data/knockOutputSpecs.ts` / `knockTests.ts` / `knockChecks.ts` — 出力形式の補足と自動採点用のテスト入力(いずれも本リポジトリ側で書いたものだが、`knock100.ts` の問題番号に紐づいているため単体では意味を持たない)
- `src/data/knockData.test.ts` — 上記のデータ整合性テスト
- `src/components/layout/AppShell.tsx` / `ModeTabs.tsx` — モード切り替えから教材モードを外す

AI生成モードは教材データに依存していないので、教材モードを外しても単独で動きます。

## その他の依存物

同梱している以下のファイルは、それぞれのライセンスに従います。

- `public/sqljs/sql-wasm.js` / `public/sqljs/sql-wasm.wasm` — [sql.js](https://github.com/sql-js/sql.js) (MIT)
- `public/coi-serviceworker.js` — [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) (MIT)
