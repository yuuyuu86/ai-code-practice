import type { IconType } from "react-icons";
import { LuClipboardCheck, LuCircleHelp, LuCompass, LuFootprints } from "react-icons/lu";
import type { Review } from "@/types/submission";

const ITEMS: Array<{
  key: keyof Pick<Review, "result" | "cause" | "direction" | "nextStep">;
  label: string;
  icon: IconType;
  tone: string;
}> = [
  { key: "result", label: "結果", icon: LuClipboardCheck, tone: "text-slate-500" },
  { key: "cause", label: "原因", icon: LuCircleHelp, tone: "text-amber-500" },
  { key: "direction", label: "直す方向", icon: LuCompass, tone: "text-blue-500" },
  { key: "nextStep", label: "次の一手", icon: LuFootprints, tone: "text-green-500" },
];

export default function ReviewPanel({ review, loading }: { review: Review | null; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-slate-700">レビュー</h3>
        {review &&
          (review.aiGenerated ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">AI</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">自動</span>
          ))}
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          AIがレビューを書いています…
        </div>
      )}

      {!loading && !review && <p className="mt-3 text-xs text-slate-400">実行するとここにレビューが表示されます。</p>}

      {review && (
        <dl className="mt-3 space-y-2.5">
          {ITEMS.map(({ key, label, icon: Icon, tone }) => (
            <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
              <dt className={`flex items-center gap-1.5 text-xs font-bold ${tone}`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{review[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
