import type { LanguageRunner, RunnerResult, RunParams } from "./types";

/**
 * SQL Runner。SQLite(sql.js / WASM)をWeb Worker内で動かす。
 *
 * 他の言語と違い「標準入力」は無い。代わりに RunParams.input へ
 * テーブル定義とデータ投入のSQL(セットアップSQL)を渡す。
 * テストケースごとに違うデータを入れられるので、
 * 答えをベタ書きしても通らない、という他言語と同じ性質を保てる。
 *
 * 出力は結果セットをタブ区切りのテキストにしたもの。
 * 1行目が列名、2行目以降が値。これで既存の出力比較の採点にそのまま乗る。
 */

/** sql.jsの本体とwasmは自分のオリジンから配る(静的書き出し+COEPでもCDNに頼らないため) */
function assetBase(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${location.origin}${basePath}/sqljs/`;
}

const workerSource = `
self.onmessage = function (e) {
  const { setupSql, query, assetBase, outputLimit } = e.data;

  function fail(type, message) { self.postMessage({ type: type, stdout: "", stderr: message }); }

  try {
    importScripts(assetBase + "sql-wasm.js");
  } catch (err) {
    fail("runtime-error", "SQLエンジンを読み込めませんでした: " + String(err));
    return;
  }

  self.initSqlJs({ locateFile: function (f) { return assetBase + f; } }).then(function (SQL) {
    var db = new SQL.Database();
    try {
      if (setupSql && setupSql.trim() !== "") db.run(setupSql);
    } catch (err) {
      // 問題側のデータ準備が失敗した場合。利用者のコードのせいではない。
      fail("runtime-error", "テストデータの準備に失敗しました: " + String(err.message || err));
      db.close();
      return;
    }

    // exec()は「0行のSELECT」と「SELECTでない文」をどちらも空配列で返すので区別できない。
    // それだと1件も該当しないデータのとき、INSERTしか書いていない答えまで正解になってしまう。
    // prepare()なら行が0でも列名を取れるので、SELECTなら必ず列名の行が出る。
    var stmt;
    try {
      stmt = db.prepare(query);
    } catch (err) {
      // 構文エラーも実行時エラーもSQLiteは同じ例外で返す。
      // 書き間違いは実行前に分かってほしいので compile-error 扱いにする。
      fail("compile-error", String(err.message || err));
      db.close();
      return;
    }

    var stdout;
    try {
      var columns = stmt.getColumnNames();
      if (columns.length === 0) {
        // INSERTなど、結果を返さない文。列名の行も出さない。
        while (stmt.step()) { /* 実行だけする */ }
        stdout = "";
      } else {
        var lines = [columns.join("\\t")];
        while (stmt.step()) {
          var row = stmt.get().map(function (v) {
            if (v === null || v === undefined) return "NULL";
            if (v instanceof Uint8Array) return "<BLOB>";
            return String(v);
          });
          lines.push(row.join("\\t"));
        }
        stdout = lines.join("\\n");
      }
    } catch (err) {
      fail("runtime-error", String(err.message || err));
      stmt.free();
      db.close();
      return;
    }
    stmt.free();
    db.close();

    if (stdout.length > outputLimit) {
      self.postMessage({ type: "output-limit", stdout: stdout.slice(0, outputLimit), stderr: "" });
      return;
    }
    self.postMessage({ type: "success", stdout: stdout, stderr: "" });
  }).catch(function (err) {
    fail("runtime-error", "SQLエンジンの初期化に失敗しました: " + String(err));
  });
};
`;

async function runSql({ code, input, timeoutMs, outputLimit }: RunParams): Promise<RunnerResult> {
  const blob = new Blob([workerSource], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  const started = performance.now();

  return new Promise<RunnerResult>((resolve) => {
    const finish = (result: Omit<RunnerResult, "elapsedMs">) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ ...result, elapsedMs: performance.now() - started });
    };
    // WASMの読み込みがあるぶん、他の言語より長めに待つ
    const timer = setTimeout(() => finish({ type: "timeout", stdout: "", stderr: "" }), timeoutMs + 8000);

    worker.onmessage = (e) => finish(e.data);
    worker.onerror = (e) =>
      finish({ type: "runtime-error", stdout: "", stderr: e.message || "SQLの実行に失敗しました" });

    worker.postMessage({ setupSql: input, query: code, assetBase: assetBase(), outputLimit });
  });
}

export const sqlRunner: LanguageRunner = {
  language: "sql",
  isAvailable: async () => typeof Worker !== "undefined",
  run: runSql,
};
