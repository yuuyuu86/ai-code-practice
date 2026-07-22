/*
 * cross-origin isolation を有効にするための Service Worker。
 *
 * このアプリのCランナー(Wasmer/clang)は SharedArrayBuffer を必要とし、そのためには
 * COOP/COEP ヘッダーが要る。ローカル開発では next.config.ts の headers() が付けるが、
 * GitHub Pages のような静的ホスティングではカスタムヘッダーを設定できない。
 * そこで Service Worker でレスポンスにヘッダーを付け直して isolation を成立させる。
 *
 * COEP は next.config.ts と同じ "credentialless" にする。CDN(unpkg/jsdelivr)から
 * 読む Wasmer SDK・Pyodide・WebLLM が CORP ヘッダー無しでも読めるようにするため。
 *
 * このファイルは「Service Worker本体」と「登録用のページスクリプト」を兼ねる。
 * self.document の有無で実行文脈を判定している。
 */
if (typeof window === "undefined") {
  // ---- Service Worker 本体として動いている場合 ----
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", (event) => {
    const request = event.request;
    // Chromeのキャッシュ専用リクエストは触るとエラーになるので素通しする
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          // opaque(status 0)なレスポンスはヘッダーを付け替えられない
          if (response.status === 0) return response;
          const headers = new Headers(response.headers);
          headers.set("Cross-Origin-Opener-Policy", "same-origin");
          headers.set("Cross-Origin-Embedder-Policy", "credentialless");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch((err) => {
          console.error("[coi-sw] fetch失敗:", err);
          throw err;
        }),
    );
  });
} else {
  // ---- 通常のページスクリプトとして読み込まれた場合 ----
  (() => {
    // すでにヘッダーが付いている(ローカル開発など)なら何もしない
    if (window.crossOriginIsolated) return;
    if (!window.isSecureContext || !("serviceWorker" in navigator)) {
      console.warn("[coi-sw] この環境ではcross-origin isolationを有効にできません(C言語の実行が使えません)");
      return;
    }

    const swUrl = document.currentScript.src;
    navigator.serviceWorker.register(swUrl).then(
      (registration) => {
        // 制御が始まっていなければ1度だけリロードして isolation を成立させる
        if (!navigator.serviceWorker.controller) {
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "activated") window.location.reload();
            });
          });
          if (registration.active) window.location.reload();
        }
      },
      (err) => console.error("[coi-sw] 登録に失敗:", err),
    );
  })();
}
