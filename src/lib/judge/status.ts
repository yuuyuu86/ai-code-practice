import type { JudgeStatus } from "@/types/judge";
import type { RunnerResultType } from "@/lib/runners/types";

export function runnerResultToStatus(type: RunnerResultType): JudgeStatus {
  switch (type) {
    case "compile-error":
      return "CE";
    case "runtime-error":
      return "RE";
    case "timeout":
      return "TLE";
    case "output-limit":
      return "OLE";
    case "success":
      return "AC"; // successは仮。実際の正誤はjudgeで判定する
  }
}

export const STATUS_LABELS: Record<JudgeStatus, string> = {
  AC: "正解",
  WA: "出力が違います",
  CE: "コンパイルエラー",
  RE: "実行時エラー",
  TLE: "実行時間超過",
  OLE: "出力が多すぎます",
};

export const STATUS_DESCRIPTIONS: Record<JudgeStatus, string> = {
  AC: "すべてのテストに合格しました。おめでとうございます!",
  WA: "追加チェックで期待と違う出力がありました。落ち着いて見直してみましょう。",
  CE: "コードの書き方に少し問題があるようです。エラーメッセージを見てみましょう。",
  RE: "実行中にエラーが起きました。入力の読み方や計算を確認してみましょう。",
  TLE: "実行に時間がかかりすぎています。ループの条件を確認してみましょう。",
  OLE: "出力がとても多くなっています。ループの回数を確認してみましょう。",
};
