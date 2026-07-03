import type { IconType } from "react-icons";
import {
  LuCircleCheck,
  LuCircleX,
  LuCircleAlert,
  LuTriangleAlert,
  LuClock,
  LuAlignJustify,
  LuLogIn,
  LuTarget,
  LuUser,
} from "react-icons/lu";
import type { JudgeResult, JudgeStatus } from "@/types/judge";
import { STATUS_DESCRIPTIONS, STATUS_LABELS } from "@/lib/judge/status";

// ステータスごとの見た目(アイコン・バナー配色・進捗バー色)。
const STATUS_META: Record<JudgeStatus, { icon: IconType; banner: string; iconColor: string; bar: string }> = {
  AC: { icon: LuCircleCheck, banner: "bg-green-50 border-green-200", iconColor: "text-green-500", bar: "bg-green-500" },
  WA: { icon: LuCircleX, banner: "bg-red-50 border-red-200", iconColor: "text-red-500", bar: "bg-red-400" },
  CE: { icon: LuCircleAlert, banner: "bg-orange-50 border-orange-200", iconColor: "text-orange-500", bar: "bg-orange-400" },
  RE: { icon: LuTriangleAlert, banner: "bg-amber-50 border-amber-200", iconColor: "text-amber-500", bar: "bg-amber-400" },
  TLE: { icon: LuClock, banner: "bg-purple-50 border-purple-200", iconColor: "text-purple-500", bar: "bg-purple-400" },
  OLE: { icon: LuAlignJustify, banner: "bg-slate-100 border-slate-300", iconColor: "text-slate-500", bar: "bg-slate-400" },
};

function Field({ title, icon: Icon, tone, text }: { title: string; icon: IconType; tone: string; text: string }) {
  return (
    <div>
      <h4 className={`mb-1 flex items-center gap-1 text-[10px] font-bold ${tone}`}>
        <Icon className="h-3 w-3" />
        {title}
      </h4>
      <pre className="max-h-28 overflow-auto rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs leading-relaxed text-slate-700">
        {text || "(出力なし)"}
      </pre>
    </div>
  );
}

export default function RunResult({ result }: { result: JudgeResult }) {
  const meta = STATUS_META[result.status];
  const Icon = meta.icon;
  const ratio = result.totalCount > 0 ? Math.round((result.passedCount / result.totalCount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700">実行結果</h3>

      {/* 結果バナー */}
      <div className={`mt-2 flex items-center gap-3 rounded-xl border p-3 ${meta.banner}`}>
        <Icon className={`h-7 w-7 shrink-0 ${meta.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-800">{result.status}</span>
            <span className="text-xs font-medium text-slate-600">{STATUS_LABELS[result.status]}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {result.passedCount}/{result.totalCount} ケース合格
            {result.elapsedMs > 0 && <> ・ {Math.round(result.elapsedMs)}ms</>}
          </p>
        </div>
      </div>

      {/* 合格ケースの進捗バー */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${meta.bar}`} style={{ width: `${ratio}%` }} />
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-600">{STATUS_DESCRIPTIONS[result.status]}</p>

      {result.failedCase && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500">
            {result.failedCase.index < 2
              ? `テストケース${result.failedCase.index + 1}での結果です`
              : "追加チェックで失敗しました。このケースを見てみましょう"}
          </p>
          <Field title="入力" icon={LuLogIn} tone="text-slate-400" text={result.failedCase.input} />
          {result.status === "WA" && (
            <>
              <Field title="期待する出力" icon={LuTarget} tone="text-green-500" text={result.failedCase.expected} />
              <Field title="あなたの出力" icon={LuUser} tone="text-red-500" text={result.failedCase.actual} />
            </>
          )}
          {result.failedCase.errorMessage && (
            <Field title="エラー内容" icon={LuTriangleAlert} tone="text-amber-500" text={result.failedCase.errorMessage} />
          )}
        </div>
      )}

      {!result.failedCase && result.message && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <Field title="メッセージ" icon={LuCircleAlert} tone="text-slate-400" text={result.message} />
        </div>
      )}
    </div>
  );
}
