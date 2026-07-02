import type { JudgeResult } from "@/types/judge";
import { STATUS_DESCRIPTIONS, STATUS_LABELS } from "@/lib/judge/status";
import StatusBadge from "./StatusBadge";

function Pre({ text }: { text: string }) {
  return (
    <pre className="max-h-32 overflow-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
      {text || "(出力なし)"}
    </pre>
  );
}

export default function RunResult({ result }: { result: JudgeResult }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-slate-700">実行結果</h3>
        <StatusBadge status={result.status} />
        <span className="text-xs text-slate-500">
          {STATUS_LABELS[result.status]}({result.passedCount}/{result.totalCount} ケース合格)
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-600">{STATUS_DESCRIPTIONS[result.status]}</p>

      {result.failedCase && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-500">
            {result.failedCase.index < 2
              ? `テストケース${result.failedCase.index + 1}での結果です`
              : "追加チェックで失敗しました。このケースを見てみましょう"}
          </p>
          <div>
            <h4 className="mb-1 text-[10px] font-bold text-slate-400">入力</h4>
            <Pre text={result.failedCase.input} />
          </div>
          {result.status === "WA" && (
            <>
              <div>
                <h4 className="mb-1 text-[10px] font-bold text-slate-400">期待する出力</h4>
                <Pre text={result.failedCase.expected} />
              </div>
              <div>
                <h4 className="mb-1 text-[10px] font-bold text-slate-400">あなたの出力</h4>
                <Pre text={result.failedCase.actual} />
              </div>
            </>
          )}
          {result.failedCase.errorMessage && (
            <div>
              <h4 className="mb-1 text-[10px] font-bold text-slate-400">エラー内容</h4>
              <Pre text={result.failedCase.errorMessage} />
            </div>
          )}
        </div>
      )}

      {!result.failedCase && result.message && (
        <div className="mt-3">
          <h4 className="mb-1 text-[10px] font-bold text-slate-400">メッセージ</h4>
          <Pre text={result.message} />
        </div>
      )}
    </div>
  );
}
