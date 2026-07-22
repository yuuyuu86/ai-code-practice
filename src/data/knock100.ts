/**
 * 基礎プロ 100本ノック(C言語の基礎練習問題集)。
 *
 * 出典: marugotoyusuke (Yusuke Kobayashi) 氏による教材
 *   サイト: https://marugotoyusuke.github.io/Knock100/
 *   リポジトリ: https://github.com/marugotoyusuke/Knock100
 * 作者(担当教員)の許諾を得て、問題文・模範解答を原文のまま収録している。
 *
 * 注意: これらの問題はAI生成問題(Problem型)と違い、標準入出力の比較による
 * 自動採点を前提としていない。表示内容が学習者ごとに異なる問題(自己紹介など)や、
 * 乱数を使う問題(96-99)が含まれるため、教材モードではAIレビューを主体にする。
 *
 * このファイルは元データから機械的に生成した。手で編集しないこと。
 */

/** 100本ノックの単元(元教材のグループ分けに準拠) */
export type KnockGroup =
  | "超基礎"
  | "条件分岐"
  | "繰り返し"
  | "配列"
  | "文字列"
  | "関数"
  | "switch"
  | "ゲーム";

export type KnockProblem = {
  /** 0-99 の問題番号 */
  no: number;
  /** 2桁ゼロ埋めの表示用番号("00"-"99") */
  noText: string;
  group: KnockGroup;
  title: string;
  /** 問題文(原文) */
  statement: string;
  /** C言語の模範解答(原文) */
  solution: string;
};

export const KNOCK_GROUPS: Array<{ group: KnockGroup; detail: string }> = [
  { group: "超基礎", detail: "表示・変数・計算・入力" },
  { group: "条件分岐", detail: "if / else" },
  { group: "繰り返し", detail: "for / while / 図形 / 素数" },
  { group: "配列", detail: "配列・2次元配列" },
  { group: "文字列", detail: "char配列" },
  { group: "関数", detail: "引数・戻り値" },
  { group: "switch", detail: "switch / 盤面" },
  { group: "ゲーム", detail: "乱数・ミニゲーム" },
];

export const KNOCK_PROBLEMS: KnockProblem[] = [
  {
    "no": 0,
    "noText": "00",
    "group": "超基礎",
    "title": "Hello",
    "statement": "実行すると Hello, World! と1行表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}"
  },
  {
    "no": 1,
    "noText": "01",
    "group": "超基礎",
    "title": "2行表示",
    "statement": "Hello, と C language! を別々の行に表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello,\\n\");\n    printf(\"C language!\\n\");\n    return 0;\n}"
  },
  {
    "no": 2,
    "noText": "02",
    "group": "超基礎",
    "title": "自己紹介",
    "statement": "自分の名前、学年、好きなものをそれぞれ1行ずつ表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    printf(\"山田太郎\\n\");\n    printf(\"1年\\n\");\n    printf(\"プログラミング\\n\");\n    return 0;\n}"
  },
  {
    "no": 3,
    "noText": "03",
    "group": "超基礎",
    "title": "タブ区切り",
    "statement": "商品名 と 価格 をタブでそろえて3行表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    printf(\"商品名\\t価格\\n\");\n    printf(\"pen\\t120\\n\");\n    printf(\"book\\t980\\n\");\n    return 0;\n}"
  },
  {
    "no": 4,
    "noText": "04",
    "group": "超基礎",
    "title": "整数の表示",
    "statement": "整数 2026 を変数に代入し、その値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int year = 2026;\n    printf(\"%d\\n\", year);\n    return 0;\n}"
  },
  {
    "no": 5,
    "noText": "05",
    "group": "超基礎",
    "title": "足し算",
    "statement": "15 + 27 の計算結果を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    printf(\"%d\\n\", 15 + 27);\n    return 0;\n}"
  },
  {
    "no": 6,
    "noText": "06",
    "group": "超基礎",
    "title": "四則演算",
    "statement": "20 と 6 の和、差、積、商、余りをそれぞれ表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a = 20;\n    int b = 6;\n    printf(\"%d\\n\", a + b);\n    printf(\"%d\\n\", a - b);\n    printf(\"%d\\n\", a * b);\n    printf(\"%d\\n\", a / b);\n    printf(\"%d\\n\", a % b);\n    return 0;\n}"
  },
  {
    "no": 7,
    "noText": "07",
    "group": "超基礎",
    "title": "小数の計算",
    "statement": "10.0 / 3.0 の結果を小数第2位まで表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    printf(\"%.2f\\n\", 10.0 / 3.0);\n    return 0;\n}"
  },
  {
    "no": 8,
    "noText": "08",
    "group": "超基礎",
    "title": "円の面積",
    "statement": "半径 5.0 の円の面積を求めて表示するプログラムを作成せよ。ただし円周率は 3.14 とする。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    double r = 5.0;\n    printf(\"%.2f\\n\", 3.14 * r * r);\n    return 0;\n}"
  },
  {
    "no": 9,
    "noText": "09",
    "group": "超基礎",
    "title": "消費税",
    "statement": "定価 1200 円の商品について、税込価格を表示するプログラムを作成せよ。税率は10%とする。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int price = 1200;\n    printf(\"%d\\n\", price * 110 / 100);\n    return 0;\n}"
  },
  {
    "no": 10,
    "noText": "10",
    "group": "超基礎",
    "title": "入力した整数",
    "statement": "整数を1つ入力させ、その値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    printf(\"%d\\n\", x);\n    return 0;\n}"
  },
  {
    "no": 11,
    "noText": "11",
    "group": "超基礎",
    "title": "入力した小数",
    "statement": "小数を1つ入力させ、その値を小数第1位まで表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    double x;\n    scanf(\"%lf\", &x);\n    printf(\"%.1f\\n\", x);\n    return 0;\n}"
  },
  {
    "no": 12,
    "noText": "12",
    "group": "超基礎",
    "title": "入力値の2倍",
    "statement": "整数を1つ入力させ、その値の2倍を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    printf(\"%d\\n\", x * 2);\n    return 0;\n}"
  },
  {
    "no": 13,
    "noText": "13",
    "group": "超基礎",
    "title": "2つの整数の和",
    "statement": "整数を2つ入力させ、それらの和を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d%d\", &a, &b);\n    printf(\"%d\\n\", a + b);\n    return 0;\n}"
  },
  {
    "no": 14,
    "noText": "14",
    "group": "超基礎",
    "title": "長方形の面積",
    "statement": "縦と横の長さを整数で入力させ、長方形の面積を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int height, width;\n    scanf(\"%d%d\", &height, &width);\n    printf(\"%d\\n\", height * width);\n    return 0;\n}"
  },
  {
    "no": 15,
    "noText": "15",
    "group": "超基礎",
    "title": "三角形の面積",
    "statement": "底辺と高さを小数で入力させ、三角形の面積を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    double base, height;\n    scanf(\"%lf%lf\", &base, &height);\n    printf(\"%.2f\\n\", base * height / 2.0);\n    return 0;\n}"
  },
  {
    "no": 16,
    "noText": "16",
    "group": "超基礎",
    "title": "割り算と余り",
    "statement": "整数を2つ入力させ、1つ目を2つ目で割った商と余りを表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d%d\", &a, &b);\n    printf(\"商 %d\\n\", a / b);\n    printf(\"余り %d\\n\", a % b);\n    return 0;\n}"
  },
  {
    "no": 17,
    "noText": "17",
    "group": "超基礎",
    "title": "桁の取り出し",
    "statement": "3桁の整数を入力させ、100の位、10の位、1の位をそれぞれ表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    printf(\"%d\\n\", n / 100);\n    printf(\"%d\\n\", n / 10 % 10);\n    printf(\"%d\\n\", n % 10);\n    return 0;\n}"
  },
  {
    "no": 18,
    "noText": "18",
    "group": "超基礎",
    "title": "割引価格",
    "statement": "定価を整数で入力させ、1割引、3割引、5割引の価格を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int price;\n    scanf(\"%d\", &price);\n    printf(\"%d\\n\", price * 9 / 10);\n    printf(\"%d\\n\", price * 7 / 10);\n    printf(\"%d\\n\", price * 5 / 10);\n    return 0;\n}"
  },
  {
    "no": 19,
    "noText": "19",
    "group": "超基礎",
    "title": "通貨換算",
    "statement": "日本円を整数で入力させ、1ドル150円としてドルに換算した金額を小数第2位まで表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int yen;\n    scanf(\"%d\", &yen);\n    printf(\"%.2f\\n\", yen / 150.0);\n    return 0;\n}"
  },
  {
    "no": 20,
    "noText": "20",
    "group": "条件分岐",
    "title": "0判定",
    "statement": "整数を1つ入力させ、0なら zero と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    if (x == 0) {\n        printf(\"zero\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 21,
    "noText": "21",
    "group": "条件分岐",
    "title": "正の数判定",
    "statement": "整数を1つ入力させ、正の数なら positive と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    if (x > 0) {\n        printf(\"positive\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 22,
    "noText": "22",
    "group": "条件分岐",
    "title": "偶数判定",
    "statement": "整数を1つ入力させ、偶数なら even と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    if (x % 2 == 0) {\n        printf(\"even\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 23,
    "noText": "23",
    "group": "条件分岐",
    "title": "偶数・奇数",
    "statement": "整数を1つ入力させ、偶数なら even、奇数なら odd と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    if (x % 2 == 0) {\n        printf(\"even\\n\");\n    } else {\n        printf(\"odd\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 24,
    "noText": "24",
    "group": "条件分岐",
    "title": "合否判定",
    "statement": "点数を入力させ、60点以上なら pass、60点未満なら fail と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int score;\n    scanf(\"%d\", &score);\n    if (score >= 60) {\n        printf(\"pass\\n\");\n    } else {\n        printf(\"fail\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 25,
    "noText": "25",
    "group": "条件分岐",
    "title": "三段階判定",
    "statement": "点数を入力させ、80点以上なら great、60点以上80点未満なら pass、60点未満なら fail と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int score;\n    scanf(\"%d\", &score);\n    if (score >= 80) {\n        printf(\"great\\n\");\n    } else if (score >= 60) {\n        printf(\"pass\\n\");\n    } else {\n        printf(\"fail\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 26,
    "noText": "26",
    "group": "条件分岐",
    "title": "最大値",
    "statement": "整数を2つ入力させ、大きい方の値を表示するプログラムを作成せよ。同じ値の場合はどちらか一方を表示すればよい。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d%d\", &a, &b);\n    if (a >= b) {\n        printf(\"%d\\n\", a);\n    } else {\n        printf(\"%d\\n\", b);\n    }\n    return 0;\n}"
  },
  {
    "no": 27,
    "noText": "27",
    "group": "条件分岐",
    "title": "絶対値",
    "statement": "整数を1つ入力させ、その絶対値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    if (x < 0) {\n        x = -x;\n    }\n    printf(\"%d\\n\", x);\n    return 0;\n}"
  },
  {
    "no": 28,
    "noText": "28",
    "group": "条件分岐",
    "title": "範囲判定",
    "statement": "整数を1つ入力させ、その値が10以上20以下なら OK、それ以外なら NG と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    if (x >= 10 && x <= 20) {\n        printf(\"OK\\n\");\n    } else {\n        printf(\"NG\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 29,
    "noText": "29",
    "group": "条件分岐",
    "title": "数当て1回",
    "statement": "プログラム内で正解の数を 7 と決めておき、整数を1つ入力させる。入力値が正解より大きければ smaller、小さければ larger、等しければ correct と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int answer = 7;\n    int x;\n    scanf(\"%d\", &x);\n    if (x > answer) {\n        printf(\"smaller\\n\");\n    } else if (x < answer) {\n        printf(\"larger\\n\");\n    } else {\n        printf(\"correct\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 30,
    "noText": "30",
    "group": "繰り返し",
    "title": "1から10まで",
    "statement": "1から10までの整数を1行ずつ表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 10; i++) {\n        printf(\"%d\\n\", i);\n    }\n    return 0;\n}"
  },
  {
    "no": 31,
    "noText": "31",
    "group": "繰り返し",
    "title": "10から1まで",
    "statement": "10から1までの整数を1行ずつ表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 10; i >= 1; i--) {\n        printf(\"%d\\n\", i);\n    }\n    return 0;\n}"
  },
  {
    "no": 32,
    "noText": "32",
    "group": "繰り返し",
    "title": "Hello 5回",
    "statement": "Hello を5回表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 0; i < 5; i++) {\n        printf(\"Hello\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 33,
    "noText": "33",
    "group": "繰り返し",
    "title": "指定回数表示",
    "statement": "整数を1つ入力させ、その回数だけ Hello と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 0; i < n; i++) {\n        printf(\"Hello\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 34,
    "noText": "34",
    "group": "繰り返し",
    "title": "1からnまで",
    "statement": "整数 n を入力させ、1から n までの整数を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        printf(\"%d\\n\", i);\n    }\n    return 0;\n}"
  },
  {
    "no": 35,
    "noText": "35",
    "group": "繰り返し",
    "title": "nから0まで",
    "statement": "整数 n を入力させ、n から0までの整数を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = n; i >= 0; i--) {\n        printf(\"%d\\n\", i);\n    }\n    return 0;\n}"
  },
  {
    "no": 36,
    "noText": "36",
    "group": "繰り返し",
    "title": "1から100までの合計",
    "statement": "1から100までの整数の合計を求めて表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int sum = 0;\n    for (int i = 1; i <= 100; i++) {\n        sum += i;\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}"
  },
  {
    "no": 37,
    "noText": "37",
    "group": "繰り返し",
    "title": "1からnまでの合計",
    "statement": "整数 n を入力させ、1から n までの整数の合計を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n, sum = 0;\n    scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        sum += i;\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}"
  },
  {
    "no": 38,
    "noText": "38",
    "group": "繰り返し",
    "title": "n個の合計",
    "statement": "最初に個数 n を入力させ、その後に整数を n 個入力させる。入力された整数の合計を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n, x, sum = 0;\n    scanf(\"%d\", &n);\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d\", &x);\n        sum += x;\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}"
  },
  {
    "no": 39,
    "noText": "39",
    "group": "繰り返し",
    "title": "0で終了",
    "statement": "整数を繰り返し入力させ、0が入力されたら終了するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    while (1) {\n        scanf(\"%d\", &x);\n        if (x == 0) {\n            break;\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 40,
    "noText": "40",
    "group": "繰り返し",
    "title": "0までの合計",
    "statement": "整数を繰り返し入力させ、0が入力されたら入力を終了する。0より前に入力された値の合計を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x, sum = 0;\n    while (1) {\n        scanf(\"%d\", &x);\n        if (x == 0) {\n            break;\n        }\n        sum += x;\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}"
  },
  {
    "no": 41,
    "noText": "41",
    "group": "繰り返し",
    "title": "7の倍数まで",
    "statement": "整数を繰り返し入力させ、入力値の合計が7の倍数になったら合計を表示して終了するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x, sum = 0;\n    while (1) {\n        scanf(\"%d\", &x);\n        sum += x;\n        if (sum % 7 == 0) {\n            break;\n        }\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}"
  },
  {
    "no": 42,
    "noText": "42",
    "group": "繰り返し",
    "title": "指定回数の平均",
    "statement": "最初に個数 n を入力させ、その後に整数を n 個入力させる。合計と平均を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n, x, sum = 0;\n    scanf(\"%d\", &n);\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d\", &x);\n        sum += x;\n    }\n    printf(\"%d\\n\", sum);\n    printf(\"%.1f\\n\", (double)sum / n);\n    return 0;\n}"
  },
  {
    "no": 43,
    "noText": "43",
    "group": "繰り返し",
    "title": "5回の最大値",
    "statement": "整数を5回入力させ、その中の最大値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x, max;\n    scanf(\"%d\", &max);\n    for (int i = 1; i < 5; i++) {\n        scanf(\"%d\", &x);\n        if (x > max) {\n            max = x;\n        }\n    }\n    printf(\"%d\\n\", max);\n    return 0;\n}"
  },
  {
    "no": 44,
    "noText": "44",
    "group": "繰り返し",
    "title": "5回の最小値",
    "statement": "整数を5回入力させ、その中の最小値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x, min;\n    scanf(\"%d\", &min);\n    for (int i = 1; i < 5; i++) {\n        scanf(\"%d\", &x);\n        if (x < min) {\n            min = x;\n        }\n    }\n    printf(\"%d\\n\", min);\n    return 0;\n}"
  },
  {
    "no": 45,
    "noText": "45",
    "group": "繰り返し",
    "title": "棒グラフ",
    "statement": "整数を1つ入力させ、その数だけ * を横1行に表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 0; i < n; i++) {\n        printf(\"*\");\n    }\n    printf(\"\\n\");\n    return 0;\n}"
  },
  {
    "no": 46,
    "noText": "46",
    "group": "繰り返し",
    "title": "5個ごとに空白",
    "statement": "整数を1つ入力させ、その数だけ * を表示する。ただし5個ごとに空白を1つ入れるプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        printf(\"*\");\n        if (i % 5 == 0) {\n            printf(\" \");\n        }\n    }\n    printf(\"\\n\");\n    return 0;\n}"
  },
  {
    "no": 47,
    "noText": "47",
    "group": "繰り返し",
    "title": "正方形",
    "statement": "整数 n を入力させ、* を使って縦 n、横 n の正方形を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            printf(\"*\");\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 48,
    "noText": "48",
    "group": "繰り返し",
    "title": "長方形",
    "statement": "縦と横の長さを入力させ、* を使ってその大きさの長方形を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int height, width;\n    scanf(\"%d%d\", &height, &width);\n    for (int i = 0; i < height; i++) {\n        for (int j = 0; j < width; j++) {\n            printf(\"*\");\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 49,
    "noText": "49",
    "group": "繰り返し",
    "title": "右上がり三角形",
    "statement": "整数 n を入力させ、1行目に1個、2行目に2個、...、n 行目に n 個の * を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        for (int j = 0; j < i; j++) {\n            printf(\"*\");\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 50,
    "noText": "50",
    "group": "繰り返し",
    "title": "右下がり三角形",
    "statement": "整数 n を入力させ、1行目に n 個、2行目に n - 1 個、...、最後の行に1個の * を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = n; i >= 1; i--) {\n        for (int j = 0; j < i; j++) {\n            printf(\"*\");\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 51,
    "noText": "51",
    "group": "繰り返し",
    "title": "右寄せ三角形",
    "statement": "整数 n を入力させ、空白と * を使って右寄せの三角形を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        for (int j = 0; j < n - i; j++) {\n            printf(\" \");\n        }\n        for (int j = 0; j < i; j++) {\n            printf(\"*\");\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 52,
    "noText": "52",
    "group": "繰り返し",
    "title": "九九表",
    "statement": "1の段から9の段までの九九表を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 9; i++) {\n        for (int j = 1; j <= 9; j++) {\n            printf(\"%3d\", i * j);\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 53,
    "noText": "53",
    "group": "繰り返し",
    "title": "3の倍数",
    "statement": "1から50までの整数を表示する。ただし3の倍数のときは数の代わりに bar と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 50; i++) {\n        if (i % 3 == 0) {\n            printf(\"bar\\n\");\n        } else {\n            printf(\"%d\\n\", i);\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 54,
    "noText": "54",
    "group": "繰り返し",
    "title": "3のつく数",
    "statement": "1から50までの整数を表示する。ただし3の倍数、または1の位が3の数のときは数の代わりに aho と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 50; i++) {\n        if (i % 3 == 0 || i % 10 == 3) {\n            printf(\"aho\\n\");\n        } else {\n            printf(\"%d\\n\", i);\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 55,
    "noText": "55",
    "group": "繰り返し",
    "title": "素数判定",
    "statement": "整数 n を入力させ、n が素数なら prime、素数でなければ not prime と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int n;\n    int prime = 1;\n    scanf(\"%d\", &n);\n    if (n < 2) {\n        prime = 0;\n    }\n    for (int i = 2; i * i <= n; i++) {\n        if (n % i == 0) {\n            prime = 0;\n        }\n    }\n    if (prime) {\n        printf(\"prime\\n\");\n    } else {\n        printf(\"not prime\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 56,
    "noText": "56",
    "group": "繰り返し",
    "title": "100までの素数",
    "statement": "1から100までの整数について、素数ならその数を表示し、素数でなければ x と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int n = 1; n <= 100; n++) {\n        int prime = 1;\n        if (n < 2) {\n            prime = 0;\n        }\n        for (int i = 2; i * i <= n; i++) {\n            if (n % i == 0) {\n                prime = 0;\n            }\n        }\n        if (prime) {\n            printf(\"%d\\n\", n);\n        } else {\n            printf(\"x\\n\");\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 57,
    "noText": "57",
    "group": "繰り返し",
    "title": "break",
    "statement": "1から10までの整数を順に表示する。ただし5を表示したら繰り返しを終了するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 10; i++) {\n        printf(\"%d\\n\", i);\n        if (i == 5) {\n            break;\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 58,
    "noText": "58",
    "group": "繰り返し",
    "title": "continue",
    "statement": "1から10までの整数を順に表示する。ただし5だけは表示しないプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 10; i++) {\n        if (i == 5) {\n            continue;\n        }\n        printf(\"%d\\n\", i);\n    }\n    return 0;\n}"
  },
  {
    "no": 59,
    "noText": "59",
    "group": "繰り返し",
    "title": "入力制限",
    "statement": "10以下の整数が入力されるまで入力を繰り返し、最後に入力された値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    do {\n        scanf(\"%d\", &x);\n    } while (x > 10);\n    printf(\"%d\\n\", x);\n    return 0;\n}"
  },
  {
    "no": 60,
    "noText": "60",
    "group": "配列",
    "title": "配列の初期化",
    "statement": "要素数5の整数配列を作り、10, 20, 30, 40, 50 を代入して順に表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a[5] = {10, 20, 30, 40, 50};\n    for (int i = 0; i < 5; i++) {\n        printf(\"%d\\n\", a[i]);\n    }\n    return 0;\n}"
  },
  {
    "no": 61,
    "noText": "61",
    "group": "配列",
    "title": "配列に入力",
    "statement": "要素数5の整数配列を作り、整数を5個入力させ、入力された順に表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a[5];\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &a[i]);\n    }\n    for (int i = 0; i < 5; i++) {\n        printf(\"%d\\n\", a[i]);\n    }\n    return 0;\n}"
  },
  {
    "no": 62,
    "noText": "62",
    "group": "配列",
    "title": "配列の合計",
    "statement": "要素数5の整数配列に点数を入力させ、合計を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int score[5];\n    int sum = 0;\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &score[i]);\n        sum += score[i];\n    }\n    printf(\"%d\\n\", sum);\n    return 0;\n}"
  },
  {
    "no": 63,
    "noText": "63",
    "group": "配列",
    "title": "配列の平均",
    "statement": "要素数5の整数配列に点数を入力させ、平均を小数第1位まで表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int score[5];\n    int sum = 0;\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &score[i]);\n        sum += score[i];\n    }\n    printf(\"%.1f\\n\", sum / 5.0);\n    return 0;\n}"
  },
  {
    "no": 64,
    "noText": "64",
    "group": "配列",
    "title": "配列の最大値",
    "statement": "要素数5の整数配列に値を入力させ、最大値を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a[5], max;\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &a[i]);\n    }\n    max = a[0];\n    for (int i = 1; i < 5; i++) {\n        if (a[i] > max) {\n            max = a[i];\n        }\n    }\n    printf(\"%d\\n\", max);\n    return 0;\n}"
  },
  {
    "no": 65,
    "noText": "65",
    "group": "配列",
    "title": "配列の合否",
    "statement": "5人分の点数を配列に入力させ、各点数について60点以上なら pass、60点未満なら fail と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int score[5];\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &score[i]);\n    }\n    for (int i = 0; i < 5; i++) {\n        if (score[i] >= 60) {\n            printf(\"pass\\n\");\n        } else {\n            printf(\"fail\\n\");\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 66,
    "noText": "66",
    "group": "配列",
    "title": "逆順表示",
    "statement": "要素数5の整数配列に値を入力させ、入力と逆の順番で表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a[5];\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &a[i]);\n    }\n    for (int i = 4; i >= 0; i--) {\n        printf(\"%d\\n\", a[i]);\n    }\n    return 0;\n}"
  },
  {
    "no": 67,
    "noText": "67",
    "group": "配列",
    "title": "配列の検索",
    "statement": "要素数5の整数配列に値を入力させたあと、探したい値を1つ入力させる。その値が配列の中にあれば found、なければ not found と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int a[5], target;\n    int found = 0;\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%d\", &a[i]);\n    }\n    scanf(\"%d\", &target);\n    for (int i = 0; i < 5; i++) {\n        if (a[i] == target) {\n            found = 1;\n        }\n    }\n    if (found) {\n        printf(\"found\\n\");\n    } else {\n        printf(\"not found\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 68,
    "noText": "68",
    "group": "配列",
    "title": "2次元配列の九九",
    "statement": "10行10列の整数配列を用意し、kuku[i][j] に i * j を入れて、1の段から9の段まで表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int kuku[10][10];\n    for (int i = 1; i <= 9; i++) {\n        for (int j = 1; j <= 9; j++) {\n            kuku[i][j] = i * j;\n        }\n    }\n    for (int i = 1; i <= 9; i++) {\n        for (int j = 1; j <= 9; j++) {\n            printf(\"%3d\", kuku[i][j]);\n        }\n        printf(\"\\n\");\n    }\n    return 0;\n}"
  },
  {
    "no": 69,
    "noText": "69",
    "group": "配列",
    "title": "2教科の成績",
    "statement": "6人分の国語と算数の点数を2次元配列に入力させ、各人の合計と平均を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int score[6][2];\n    for (int i = 0; i < 6; i++) {\n        scanf(\"%d%d\", &score[i][0], &score[i][1]);\n    }\n    for (int i = 0; i < 6; i++) {\n        int sum = score[i][0] + score[i][1];\n        printf(\"%d %.1f\\n\", sum, sum / 2.0);\n    }\n    return 0;\n}"
  },
  {
    "no": 70,
    "noText": "70",
    "group": "文字列",
    "title": "文字列の入力",
    "statement": "名前を文字列として入力させ、Hello, 名前 と表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char name[100];\n    scanf(\"%99s\", name);\n    printf(\"Hello, %s\\n\", name);\n    return 0;\n}"
  },
  {
    "no": 71,
    "noText": "71",
    "group": "文字列",
    "title": "文字の取り出し",
    "statement": "文字列を1つ入力させ、先頭の文字と3文字目を表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char s[100];\n    scanf(\"%99s\", s);\n    printf(\"%c\\n\", s[0]);\n    printf(\"%c\\n\", s[2]);\n    return 0;\n}"
  },
  {
    "no": 72,
    "noText": "72",
    "group": "文字列",
    "title": "イニシャル",
    "statement": "名字と名前を別々の文字列として入力させ、名前の先頭文字と名字の先頭文字を使ってイニシャルを表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char family[100], given[100];\n    scanf(\"%99s%99s\", family, given);\n    printf(\"%c.%c.\\n\", given[0], family[0]);\n    return 0;\n}"
  },
  {
    "no": 73,
    "noText": "73",
    "group": "文字列",
    "title": "文字列配列",
    "statement": "5個の文字列を入力させ、入力された文字列を順に表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char words[5][100];\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%99s\", words[i]);\n    }\n    for (int i = 0; i < 5; i++) {\n        printf(\"%s\\n\", words[i]);\n    }\n    return 0;\n}"
  },
  {
    "no": 74,
    "noText": "74",
    "group": "文字列",
    "title": "aで始まる文字列",
    "statement": "5個の文字列を入力させ、その中から a で始まる文字列だけを表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char words[5][100];\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%99s\", words[i]);\n    }\n    for (int i = 0; i < 5; i++) {\n        if (words[i][0] == 'a') {\n            printf(\"%s\\n\", words[i]);\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 75,
    "noText": "75",
    "group": "文字列",
    "title": "文字のカウント",
    "statement": "5個の文字列を入力させ、すべての文字列に含まれる o の数を数えて表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char words[5][100];\n    int count = 0;\n    for (int i = 0; i < 5; i++) {\n        scanf(\"%99s\", words[i]);\n    }\n    for (int i = 0; i < 5; i++) {\n        for (int j = 0; words[i][j] != '\\0'; j++) {\n            if (words[i][j] == 'o') {\n                count++;\n            }\n        }\n    }\n    printf(\"%d\\n\", count);\n    return 0;\n}"
  },
  {
    "no": 76,
    "noText": "76",
    "group": "文字列",
    "title": "終端文字まで",
    "statement": "文字列を1つ入力させ、先頭から終端文字 \\0 に到達するまで1文字ずつ表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char s[100];\n    scanf(\"%99s\", s);\n    for (int i = 0; s[i] != '\\0'; i++) {\n        printf(\"%c\\n\", s[i]);\n    }\n    return 0;\n}"
  },
  {
    "no": 77,
    "noText": "77",
    "group": "文字列",
    "title": "文字変換",
    "statement": "文字列を1つ入力させ、文字 a は 1、文字 b は 2、文字 c は 3、それ以外の文字はそのまま表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    char s[100];\n    scanf(\"%99s\", s);\n    for (int i = 0; s[i] != '\\0'; i++) {\n        if (s[i] == 'a') {\n            printf(\"1\");\n        } else if (s[i] == 'b') {\n            printf(\"2\");\n        } else if (s[i] == 'c') {\n            printf(\"3\");\n        } else {\n            printf(\"%c\", s[i]);\n        }\n    }\n    printf(\"\\n\");\n    return 0;\n}"
  },
  {
    "no": 78,
    "noText": "78",
    "group": "関数",
    "title": "関数であいさつ",
    "statement": "Hello と表示する関数 hello を作り、main 関数から呼び出すプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nvoid hello(void) {\n    printf(\"Hello\\n\");\n}\n\nint main(void) {\n    hello();\n    return 0;\n}"
  },
  {
    "no": 79,
    "noText": "79",
    "group": "関数",
    "title": "関数で税込価格",
    "statement": "整数の価格を受け取り、税込価格を表示する関数を作成せよ。main 関数から価格 1000 を渡して呼び出すこと。",
    "solution": "#include <stdio.h>\n\nvoid print_tax_included(int price) {\n    printf(\"%d\\n\", price * 110 / 100);\n}\n\nint main(void) {\n    print_tax_included(1000);\n    return 0;\n}"
  },
  {
    "no": 80,
    "noText": "80",
    "group": "関数",
    "title": "関数で合計",
    "statement": "2つの整数を受け取り、その和を返す関数 sum2 を作成せよ。main 関数で2つの値を入力させ、戻り値を表示すること。",
    "solution": "#include <stdio.h>\n\nint sum2(int a, int b) {\n    return a + b;\n}\n\nint main(void) {\n    int a, b;\n    scanf(\"%d%d\", &a, &b);\n    printf(\"%d\\n\", sum2(a, b));\n    return 0;\n}"
  },
  {
    "no": 81,
    "noText": "81",
    "group": "関数",
    "title": "関数で最大値",
    "statement": "2つの整数を受け取り、大きい方を返す関数 max2 を作成せよ。",
    "solution": "#include <stdio.h>\n\nint max2(int a, int b) {\n    if (a >= b) {\n        return a;\n    }\n    return b;\n}\n\nint main(void) {\n    int a, b;\n    scanf(\"%d%d\", &a, &b);\n    printf(\"%d\\n\", max2(a, b));\n    return 0;\n}"
  },
  {
    "no": 82,
    "noText": "82",
    "group": "関数",
    "title": "関数で3つの最大値",
    "statement": "3つの整数を受け取り、最大値を返す関数 max3 を作成せよ。",
    "solution": "#include <stdio.h>\n\nint max3(int a, int b, int c) {\n    int max = a;\n    if (b > max) {\n        max = b;\n    }\n    if (c > max) {\n        max = c;\n    }\n    return max;\n}\n\nint main(void) {\n    int a, b, c;\n    scanf(\"%d%d%d\", &a, &b, &c);\n    printf(\"%d\\n\", max3(a, b, c));\n    return 0;\n}"
  },
  {
    "no": 83,
    "noText": "83",
    "group": "関数",
    "title": "関数で平均",
    "statement": "3つの整数を受け取り、平均値を double で返す関数 average3 を作成せよ。",
    "solution": "#include <stdio.h>\n\ndouble average3(int a, int b, int c) {\n    return (a + b + c) / 3.0;\n}\n\nint main(void) {\n    int a, b, c;\n    scanf(\"%d%d%d\", &a, &b, &c);\n    printf(\"%.1f\\n\", average3(a, b, c));\n    return 0;\n}"
  },
  {
    "no": 84,
    "noText": "84",
    "group": "関数",
    "title": "関数で正方形",
    "statement": "整数 n を受け取り、* で n 行 n 列の正方形を表示する関数を作成せよ。",
    "solution": "#include <stdio.h>\n\nvoid print_square(int n) {\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            printf(\"*\");\n        }\n        printf(\"\\n\");\n    }\n}\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    print_square(n);\n    return 0;\n}"
  },
  {
    "no": 85,
    "noText": "85",
    "group": "関数",
    "title": "関数で合計1からn",
    "statement": "整数 n を受け取り、1から n までの合計を返す関数を作成せよ。",
    "solution": "#include <stdio.h>\n\nint sum_to_n(int n) {\n    int sum = 0;\n    for (int i = 1; i <= n; i++) {\n        sum += i;\n    }\n    return sum;\n}\n\nint main(void) {\n    int n;\n    scanf(\"%d\", &n);\n    printf(\"%d\\n\", sum_to_n(n));\n    return 0;\n}"
  },
  {
    "no": 86,
    "noText": "86",
    "group": "関数",
    "title": "関数で入力制限",
    "statement": "最大値 max を受け取り、max 以下の整数が入力されるまで入力を繰り返し、入力された値を返す関数を作成せよ。",
    "solution": "#include <stdio.h>\n\nint input_until_max(int max) {\n    int x;\n    do {\n        scanf(\"%d\", &x);\n    } while (x > max);\n    return x;\n}\n\nint main(void) {\n    int x = input_until_max(10);\n    printf(\"%d\\n\", x);\n    return 0;\n}"
  },
  {
    "no": 87,
    "noText": "87",
    "group": "関数",
    "title": "関数で絶対値",
    "statement": "整数を受け取り、その絶対値を返す関数を作成せよ。",
    "solution": "#include <stdio.h>\n\nint absolute(int x) {\n    if (x < 0) {\n        return -x;\n    }\n    return x;\n}\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    printf(\"%d\\n\", absolute(x));\n    return 0;\n}"
  },
  {
    "no": 88,
    "noText": "88",
    "group": "関数",
    "title": "関数で四則演算",
    "statement": "2つの整数と演算子1文字を受け取り、+, -, *, / に応じて計算結果を表示する関数を作成せよ。",
    "solution": "#include <stdio.h>\n\nvoid calculate(int a, int b, char op) {\n    switch (op) {\n        case '+':\n            printf(\"%d\\n\", a + b);\n            break;\n        case '-':\n            printf(\"%d\\n\", a - b);\n            break;\n        case '*':\n            printf(\"%d\\n\", a * b);\n            break;\n        case '/':\n            printf(\"%d\\n\", a / b);\n            break;\n    }\n}\n\nint main(void) {\n    int a, b;\n    char op;\n    scanf(\"%d %c %d\", &a, &op, &b);\n    calculate(a, b, op);\n    return 0;\n}"
  },
  {
    "no": 89,
    "noText": "89",
    "group": "switch",
    "title": "switchで余り",
    "statement": "整数を1つ入力させ、3で割った余りが0なら remainder 0、1なら remainder 1、2なら remainder 2 と switch 文で表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int x;\n    scanf(\"%d\", &x);\n    switch (x % 3) {\n        case 0:\n            printf(\"remainder 0\\n\");\n            break;\n        case 1:\n            printf(\"remainder 1\\n\");\n            break;\n        case 2:\n            printf(\"remainder 2\\n\");\n            break;\n    }\n    return 0;\n}"
  },
  {
    "no": 90,
    "noText": "90",
    "group": "switch",
    "title": "switchで季節",
    "statement": "月を整数で入力させ、3から5なら春、6から8なら夏、9から11なら秋、12, 1, 2なら冬、それ以外なら入力ミスと表示するプログラムを switch 文で作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int month;\n    scanf(\"%d\", &month);\n    switch (month) {\n        case 3:\n        case 4:\n        case 5:\n            printf(\"spring\\n\");\n            break;\n        case 6:\n        case 7:\n        case 8:\n            printf(\"summer\\n\");\n            break;\n        case 9:\n        case 10:\n        case 11:\n            printf(\"autumn\\n\");\n            break;\n        case 12:\n        case 1:\n        case 2:\n            printf(\"winter\\n\");\n            break;\n        default:\n            printf(\"input error\\n\");\n            break;\n    }\n    return 0;\n}"
  },
  {
    "no": 91,
    "noText": "91",
    "group": "switch",
    "title": "switchで月の日数",
    "statement": "月を整数で入力させ、その月の日数を表示するプログラムを switch 文で作成せよ。2月は28日としてよい。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int month;\n    scanf(\"%d\", &month);\n    switch (month) {\n        case 4:\n        case 6:\n        case 9:\n        case 11:\n            printf(\"30\\n\");\n            break;\n        case 2:\n            printf(\"28\\n\");\n            break;\n        case 1:\n        case 3:\n        case 5:\n        case 7:\n        case 8:\n        case 10:\n        case 12:\n            printf(\"31\\n\");\n            break;\n        default:\n            printf(\"input error\\n\");\n            break;\n    }\n    return 0;\n}"
  },
  {
    "no": 92,
    "noText": "92",
    "group": "switch",
    "title": "switchで曜日",
    "statement": "日にちを整数で入力させ、7で割った余りを使って曜日を表示するプログラムを switch 文で作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int day;\n    scanf(\"%d\", &day);\n    switch (day % 7) {\n        case 0:\n            printf(\"Sunday\\n\");\n            break;\n        case 1:\n            printf(\"Monday\\n\");\n            break;\n        case 2:\n            printf(\"Tuesday\\n\");\n            break;\n        case 3:\n            printf(\"Wednesday\\n\");\n            break;\n        case 4:\n            printf(\"Thursday\\n\");\n            break;\n        case 5:\n            printf(\"Friday\\n\");\n            break;\n        case 6:\n            printf(\"Saturday\\n\");\n            break;\n    }\n    return 0;\n}"
  },
  {
    "no": 93,
    "noText": "93",
    "group": "switch",
    "title": "メニュー",
    "statement": "1: start, 2: help, 3: end のメニューを表示し、入力された番号に応じてメッセージを表示するプログラムを switch 文で作成せよ。",
    "solution": "#include <stdio.h>\n\nint main(void) {\n    int menu;\n    printf(\"1: start\\n\");\n    printf(\"2: help\\n\");\n    printf(\"3: end\\n\");\n    scanf(\"%d\", &menu);\n    switch (menu) {\n        case 1:\n            printf(\"start\\n\");\n            break;\n        case 2:\n            printf(\"help\\n\");\n            break;\n        case 3:\n            printf(\"end\\n\");\n            break;\n        default:\n            printf(\"input error\\n\");\n            break;\n    }\n    return 0;\n}"
  },
  {
    "no": 94,
    "noText": "94",
    "group": "switch",
    "title": "盤面表示",
    "statement": "5行5列の盤面を - で表示し、指定した座標だけ * にして表示する関数 show_stage を作成せよ。",
    "solution": "#include <stdio.h>\n\nvoid show_stage(int x, int y) {\n    for (int i = 0; i < 5; i++) {\n        for (int j = 0; j < 5; j++) {\n            if (i == y && j == x) {\n                printf(\"*\");\n            } else {\n                printf(\"-\");\n            }\n        }\n        printf(\"\\n\");\n    }\n}\n\nint main(void) {\n    int x, y;\n    scanf(\"%d%d\", &x, &y);\n    show_stage(x, y);\n    return 0;\n}"
  },
  {
    "no": 95,
    "noText": "95",
    "group": "switch",
    "title": "移動ゲーム",
    "statement": "5行5列の盤面上で、プレイヤーの位置を上下左右に動かすプログラムを作成せよ。盤面の外に出たら GAME OVER と表示して終了すること。",
    "solution": "#include <stdio.h>\n\nvoid show_stage(int x, int y) {\n    for (int i = 0; i < 5; i++) {\n        for (int j = 0; j < 5; j++) {\n            if (i == y && j == x) {\n                printf(\"*\");\n            } else {\n                printf(\"-\");\n            }\n        }\n        printf(\"\\n\");\n    }\n}\n\nint main(void) {\n    int x = 2;\n    int y = 2;\n    char command;\n    while (1) {\n        show_stage(x, y);\n        scanf(\" %c\", &command);\n        if (command == 'w') {\n            y--;\n        } else if (command == 's') {\n            y++;\n        } else if (command == 'a') {\n            x--;\n        } else if (command == 'd') {\n            x++;\n        }\n        if (x < 0 || x >= 5 || y < 0 || y >= 5) {\n            printf(\"GAME OVER\\n\");\n            break;\n        }\n    }\n    return 0;\n}"
  },
  {
    "no": 96,
    "noText": "96",
    "group": "ゲーム",
    "title": "乱数3回",
    "statement": "rand 関数を使って乱数を3回表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n#include <stdlib.h>\n#include <time.h>\n\nint main(void) {\n    srand((unsigned int)time(NULL));\n    for (int i = 0; i < 3; i++) {\n        printf(\"%d\\n\", rand());\n    }\n    return 0;\n}"
  },
  {
    "no": 97,
    "noText": "97",
    "group": "ゲーム",
    "title": "サイコロ",
    "statement": "1から6までの乱数を作り、サイコロの目として表示するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n#include <stdlib.h>\n#include <time.h>\n\nint main(void) {\n    srand((unsigned int)time(NULL));\n    printf(\"%d\\n\", rand() % 6 + 1);\n    return 0;\n}"
  },
  {
    "no": 98,
    "noText": "98",
    "group": "ゲーム",
    "title": "連続サイコロ",
    "statement": "サイコロを繰り返し振り、同じ目が2回連続で出たら終了するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n#include <stdlib.h>\n#include <time.h>\n\nint main(void) {\n    int prev = 0;\n    int dice;\n    srand((unsigned int)time(NULL));\n    while (1) {\n        dice = rand() % 6 + 1;\n        printf(\"%d\\n\", dice);\n        if (dice == prev) {\n            break;\n        }\n        prev = dice;\n    }\n    return 0;\n}"
  },
  {
    "no": 99,
    "noText": "99",
    "group": "ゲーム",
    "title": "数当てゲーム",
    "statement": "1から100までの乱数を正解として作り、プレイヤーに最大7回まで予想を入力させる。正解より小さければ larger、大きければ smaller、正解なら correct と表示して終了するプログラムを作成せよ。",
    "solution": "#include <stdio.h>\n#include <stdlib.h>\n#include <time.h>\n\nint main(void) {\n    int answer, guess;\n    srand((unsigned int)time(NULL));\n    answer = rand() % 100 + 1;\n    for (int i = 0; i < 7; i++) {\n        scanf(\"%d\", &guess);\n        if (guess < answer) {\n            printf(\"larger\\n\");\n        } else if (guess > answer) {\n            printf(\"smaller\\n\");\n        } else {\n            printf(\"correct\\n\");\n            break;\n        }\n    }\n    return 0;\n}"
  }
];

export function getKnockProblem(no: number): KnockProblem | undefined {
  return KNOCK_PROBLEMS.find((p) => p.no === no);
}

export function getKnockProblemsByGroup(group: KnockGroup): KnockProblem[] {
  return KNOCK_PROBLEMS.filter((p) => p.group === group);
}

/** ランダムに1問選ぶ。groupを指定するとその単元から選ぶ。 */
export function pickRandomKnock(group?: KnockGroup): KnockProblem {
  const pool = group ? getKnockProblemsByGroup(group) : KNOCK_PROBLEMS;
  return pool[Math.floor(Math.random() * pool.length)];
}
