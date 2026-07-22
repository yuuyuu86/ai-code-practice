import type { Review } from "@/types/submission";

const ITEMS: Array<{ key: keyof Pick<Review, "result" | "cause" | "direction" | "nextStep">; label: string }> = [
  { key: "result", label: "結果" },
  { key: "cause", label: "原因" },
  { key: "direction", label: "直す方向" },
  { key: "nextStep", label: "次の一手" },
];

export default function ReviewPanel({
  review,
  loading,
  loadingLabel,
}: {
  review: Review | null;
  loading: boolean;
  /** モデル読み込み中など、待ち時間の内訳を出したいときに使う */
  loadingLabel?: string | null;
}) {
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
          {loadingLabel ?? "AIがレビューを書いています…"}
        </div>
      )}

      {!loading && !review && <p className="mt-3 text-xs text-slate-400">実行するとここにレビューが表示されます。</p>}

      {review && (
        <dl className="mt-3 divide-y divide-slate-100">
          {ITEMS.map(({ key, label }) => (
            <div key={key} className="py-2 first:pt-0 last:pb-0">
              <dt className="text-xs font-bold text-slate-500">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{review[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
