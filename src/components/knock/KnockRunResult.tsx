import type { IconType } from "react-icons";
import {
  LuCircleCheck,
  LuCircleX,
  LuCircleAlert,
  LuTriangleAlert,
  LuClock,
  LuAlignJustify,
  LuCircleHelp,
} from "react-icons/lu";
import type { RunnerResult, RunnerResultType } from "@/lib/runners/types";
import type { KnockVerdict } from "@/lib/knock/knockJudge";

// 配色は正解(green)とそれ以外(amber)の2トーンに統一する。
const NOT_OK = { banner: "bg-amber-50 border-amber-200", iconColor: "text-amber-500" };
const RUN_META: Record<RunnerResultType, { icon: IconType; label: string; banner: string; iconColor: string }> = {
  success: {
    icon: LuCircleCheck,
    label: "実行できました",
    banner: "bg-green-50 border-green-200",
    iconColor: "text-green-500",
  },
  "compile-error": { icon: LuCircleAlert, label: "コンパイルエラー", ...NOT_OK },
  "runtime-error": { icon: LuTriangleAlert, label: "実行時エラー", ...NOT_OK },
  timeout: { icon: LuClock, label: "時間切れ", ...NOT_OK },
  "output-limit": { icon: LuAlignJustify, label: "出力が多すぎます", ...NOT_OK },
};

/** 合否が出ているときはそれを見出しにする(実行できたかより重要なため) */
function bannerOf(result: RunnerResult, verdict: KnockVerdict | null) {
  if (result.type !== "success" || !verdict) return RUN_META[result.type];
  switch (verdict.kind) {
    case "AC":
      return {
        icon: LuCircleCheck,
        label: "正解",
        banner: "bg-green-50 border-green-200",
        iconColor: "text-green-500",
      };
    case "WA":
      return { icon: LuCircleX, label: "不正解", ...NOT_OK };
    case "skipped":
    case "unavailable":
      return { icon: LuCircleHelp, label: "実行できました(判定なし)", ...NOT_OK };
  }
}

/** バナー下の補足文 */
function noteOf(result: RunnerResult, verdict: KnockVerdict | null): string {
  if (result.type !== "success") return "エラーの内容を見て直してみましょう";
  if (!verdict) return "出力が問題文どおりか確かめましょう";
  switch (verdict.kind) {
    case "AC":
      return "模範解答と同じ出力になりました";
    case "WA":
      return "模範解答と出力が違います。下の期待する出力と見比べましょう";
    case "skipped":
      return `この問題は自動判定できません(${verdict.reason})。出力が問題文どおりか確かめましょう`;
    case "unavailable":
      return verdict.reason;
  }
}

function Field({ title, text, tone }: { title: string; text: string; tone?: string }) {
  return (
    <div>
      <h4 className={`mb-1 text-[10px] font-bold ${tone ?? "text-slate-400"}`}>{title}</h4>
      <pre className="max-h-28 overflow-auto rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs leading-relaxed text-slate-700">
        {text || "(出力なし)"}
      </pre>
    </div>
  );
}

export default function KnockRunResult({
  result,
  verdict,
}: {
  result: RunnerResult;
  verdict: KnockVerdict | null;
}) {
  const meta = bannerOf(result, verdict);
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700">実行結果</h3>

      <div className={`mt-2 flex items-center gap-3 rounded-xl border p-3 ${meta.banner}`}>
        <Icon className={`h-7 w-7 shrink-0 ${meta.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{meta.label}</p>
          <p className="text-[11px] text-slate-500">
            {noteOf(result, verdict)}
            {result.elapsedMs > 0 && <> ・ {Math.round(result.elapsedMs)}ms</>}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {verdict?.kind === "WA" && (
          <Field title="期待する出力(模範解答)" text={verdict.expected} tone="text-green-500" />
        )}
        <Field
          title={verdict?.kind === "WA" ? "あなたの出力" : "標準出力"}
          text={result.stdout}
          tone={verdict?.kind === "WA" ? "text-red-500" : undefined}
        />
        {result.stderr.trim() !== "" && <Field title="エラー出力" text={result.stderr} />}
      </div>
    </div>
  );
}
