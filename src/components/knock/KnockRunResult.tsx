import type { IconType } from "react-icons";
import { LuCircleCheck, LuCircleAlert, LuTriangleAlert, LuClock, LuAlignJustify } from "react-icons/lu";
import type { RunnerResult, RunnerResultType } from "@/lib/runners/types";

// 配色は正常終了(green)とそれ以外(amber)の2トーンに統一する。
const NOT_OK = { banner: "bg-amber-50 border-amber-200", iconColor: "text-amber-500" };
const META: Record<RunnerResultType, { icon: IconType; label: string; banner: string; iconColor: string }> = {
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

function Field({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="mb-1 text-[10px] font-bold text-slate-400">{title}</h4>
      <pre className="max-h-28 overflow-auto rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs leading-relaxed text-slate-700">
        {text || "(出力なし)"}
      </pre>
    </div>
  );
}

export default function KnockRunResult({ result }: { result: RunnerResult }) {
  const meta = META[result.type];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700">実行結果</h3>

      <div className={`mt-2 flex items-center gap-3 rounded-xl border p-3 ${meta.banner}`}>
        <Icon className={`h-7 w-7 shrink-0 ${meta.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{meta.label}</p>
          <p className="text-[11px] text-slate-500">
            この教材では合否の自動判定はしません。出力が問題文どおりか確かめましょう
            {result.elapsedMs > 0 && <> ・ {Math.round(result.elapsedMs)}ms</>}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Field title="標準出力" text={result.stdout} />
        {result.stderr.trim() !== "" && <Field title="エラー出力" text={result.stderr} />}
      </div>
    </div>
  );
}
