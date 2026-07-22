/**
 * 出力形式の補足。
 *
 * 自動採点は模範解答と出力を突き合わせるが、問題文には書かれていない文字列を
 * 模範解答が出しているケースがある(例: No.90 は問題文が「春」なのに模範解答は
 * "spring" を出力する)。そのままだと正しく考えて書いた解答が不正解になるため、
 * 採点に合わせるべき出力形式をここに書いて画面に出す。
 *
 * 元教材の問題文は変更しない。あくまでアプリ側の補足として表示する。
 */
export const KNOCK_OUTPUT_SPECS: Record<number, string> = {
  72: "イニシャルは「名前の頭文字.名字の頭文字.」の形式で表示します。例: 名字 Yamada / 名前 Taro なら T.Y.",
  90: "季節は英語で spring / summer / autumn / winter と表示します。該当しない月は input error と表示します。",
  91: "日数を数字だけで表示します(31 / 30 / 28)。1〜12以外の月は input error と表示します。",
  92: "曜日は英語で Sunday / Monday / Tuesday / Wednesday / Thursday / Friday / Saturday と表示します(余り0がSunday)。",
  93: "最初にメニュー(1: start / 2: help / 3: end)を3行表示してから、選ばれた番号に応じて start / help / end を表示します。1〜3以外は input error と表示します。",
  95: "盤面は5行5列で、プレイヤーの位置を * 、それ以外を - で表示します(1手ごとに盤面を表示)。盤面の外に出たら GAME OVER と表示します。",
};

export function getOutputSpec(no: number): string | undefined {
  return KNOCK_OUTPUT_SPECS[no];
}
