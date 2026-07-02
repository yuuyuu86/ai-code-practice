import type { JudgeStatus } from "@/types/judge";

const STYLES: Record<JudgeStatus, string> = {
  AC: "bg-green-100 text-green-700 border-green-300",
  WA: "bg-red-50 text-red-600 border-red-200",
  CE: "bg-orange-50 text-orange-600 border-orange-200",
  RE: "bg-amber-50 text-amber-700 border-amber-200",
  TLE: "bg-purple-50 text-purple-600 border-purple-200",
  OLE: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function StatusBadge({ status, size = "md" }: { status: JudgeStatus; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-block rounded-full border font-bold ${sizeClass} ${STYLES[status]}`}>
      {status}
    </span>
  );
}
