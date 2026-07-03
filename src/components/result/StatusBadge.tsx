import type { JudgeStatus } from "@/types/judge";

// 配色は AC(緑)と、それ以外(琥珀)の2トーンに統一する。
// 状態の区別はラベル文字とアイコン(RunResult側)で行う。
const NOT_AC_STYLE = "bg-amber-50 text-amber-700 border-amber-200";
const STYLES: Record<JudgeStatus, string> = {
  AC: "bg-green-100 text-green-700 border-green-300",
  WA: NOT_AC_STYLE,
  CE: NOT_AC_STYLE,
  RE: NOT_AC_STYLE,
  TLE: NOT_AC_STYLE,
  OLE: NOT_AC_STYLE,
};

export default function StatusBadge({ status, size = "md" }: { status: JudgeStatus; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-block rounded-full border font-bold ${sizeClass} ${STYLES[status]}`}>
      {status}
    </span>
  );
}
