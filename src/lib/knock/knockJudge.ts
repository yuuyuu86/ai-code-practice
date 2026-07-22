import type { KnockProblem } from "@/data/knock100";
import { compareOutput } from "@/lib/judge/compareOutput";
import { getRunner } from "@/lib/runners/runnerManager";
import { DEFAULT_OUTPUT_LIMIT, type RunnerResultType } from "@/lib/runners/types";

/**
 * 教材モードの合否判定。
 *
 * この教材にはテストケースが付いていないが、全100問に模範解答があるので、
 * 「同じ標準入力で模範解答を実行した結果」を期待出力として提出コードと比較する。
 * (AI生成モードの buildTests と同じ考え方を、実行時に行う)
 *
 * ただし次の問題は原理的に一致比較ができないため判定対象外にする:
 * - 出力が学習者ごとに変わる問題(自分の名前や好きな商品名を表示する等)
 * - 乱数を使う問題(同じ入力でも実行のたびに出力が変わる)
 */
const NON_JUDGEABLE: Record<number, string> = {
  2: "表示する内容(名前・学年・好きなもの)が人によって違うため",
  3: "表示する商品名と価格を自由に決められるため",
  96: "乱数を使うため実行のたびに出力が変わる",
  97: "乱数を使うため実行のたびに出力が変わる",
  98: "乱数を使うため実行のたびに出力が変わる",
  99: "乱数を使うため実行のたびに出力が変わる",
};

export type KnockVerdict =
  /** 模範解答と同じ出力になった */
  | { kind: "AC" }
  /** 出力が模範解答と違う */
  | { kind: "WA"; expected: string }
  /** 判定対象外の問題 */
  | { kind: "skipped"; reason: string }
  /** 模範解答を実行できず判定できなかった */
  | { kind: "unavailable"; reason: string };

export function isJudgeable(no: number): boolean {
  return !(no in NON_JUDGEABLE);
}

/** 模範解答の実行は学習者のコードより少し余裕を持たせる */
const REFERENCE_TIMEOUT_MS = 5000;

/**
 * 提出コードの出力を模範解答の出力と比較して合否を返す。
 * 提出コードが正常終了しなかった場合(CE/RE/TLE/OLE)は呼ばない想定。
 */
export async function judgeKnock(params: {
  problem: KnockProblem;
  stdin: string;
  userStdout: string;
}): Promise<KnockVerdict> {
  const reason = NON_JUDGEABLE[params.problem.no];
  if (reason) {
    return { kind: "skipped", reason };
  }

  const reference = await getRunner("c").run({
    code: params.problem.solution,
    input: params.stdin,
    timeoutMs: REFERENCE_TIMEOUT_MS,
    outputLimit: DEFAULT_OUTPUT_LIMIT,
  });

  if (reference.type !== "success") {
    return { kind: "unavailable", reason: describeReferenceFailure(reference.type, params.stdin) };
  }

  return compareOutput(params.userStdout, reference.stdout)
    ? { kind: "AC" }
    : { kind: "WA", expected: reference.stdout };
}

/**
 * 模範解答が動かなかった理由の説明。
 * 入力が必要な問題で標準入力が空だと模範解答も失敗するので、そこを案内する。
 */
function describeReferenceFailure(type: RunnerResultType, stdin: string): string {
  if (stdin.trim() === "") {
    return "この問題は標準入力が必要そうです。標準入力欄に値を入れてから実行すると合否を判定できます";
  }
  if (type === "timeout") {
    return "模範解答が時間内に終わりませんでした。標準入力の値が問題文の形式に合っているか確認してください";
  }
  return "入力した値では模範解答を実行できなかったため、合否を判定できませんでした。標準入力が問題文の形式に合っているか確認してください";
}
