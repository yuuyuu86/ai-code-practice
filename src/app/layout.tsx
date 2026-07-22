import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIコード練習 | ブラウザ内AIプログラミング練習",
  description: "ブラウザ内AIが問題を生成し、ブラウザ内で実行・判定・レビューまでできる初心者向けプログラミング練習サイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          静的ホスティング(GitHub Pages)ではCOOP/COEPヘッダーを設定できないため、
          Service Workerで付与してSharedArrayBuffer(Cランナー)を使えるようにする。
          ヘッダーが既にある環境ではスクリプト側が何もしないので、開発時は無害。
          アプリのJSより先に実行してリロード回数を減らすため beforeInteractive にする。
        */}
        <Script src={`${basePath}/coi-serviceworker.js`} strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
