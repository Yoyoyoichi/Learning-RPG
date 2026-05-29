// =============================
// クイズ もんだいデータベース
// type: 'choice' → 4たくクイズ
// type: 'input'  → 入力クイズ（カタカナ or 数字）
// =============================

export let QUESTIONS_DB = [
  // ========== 県庁所在地（4択） ==========
  {
    id: 1, category: "県庁所在地", type: "choice",
    question: "北海道の道庁所在地はどこ？",
    answer: "札幌市", choices: ["札幌市", "函館市", "小樽市", "旭川市"]
  },
  {
    id: 2, category: "県庁所在地", type: "choice",
    question: "岩手県の県庁所在地はどこ？",
    answer: "盛岡市", choices: ["盛岡市", "岩手市", "一関市", "花巻市"]
  },
  {
    id: 3, category: "県庁所在地", type: "choice",
    question: "宮城県の県庁所在地はどこ？",
    answer: "仙台市", choices: ["仙台市", "宮城市", "石巻市", "大崎市"]
  },
  {
    id: 4, category: "県庁所在地", type: "choice",
    question: "茨城県の県庁所在地はどこ？",
    answer: "水戸市", choices: ["水戸市", "茨城市", "つくば市", "日立市"]
  },
  {
    id: 5, category: "県庁所在地", type: "choice",
    question: "栃木県の県庁所在地はどこ？",
    answer: "宇都宮市", choices: ["宇都宮市", "栃木市", "小山市", "足利市"]
  },
  {
    id: 6, category: "県庁所在地", type: "choice",
    question: "群馬県の県庁所在地はどこ？",
    answer: "前橋市", choices: ["前橋市", "群馬市", "高崎市", "太田市"]
  },
  {
    id: 7, category: "県庁所在地", type: "choice",
    question: "神奈川県の県庁所在地はどこ？",
    answer: "横浜市", choices: ["横浜市", "神奈川市", "川崎市", "相模原市"]
  },
  {
    id: 8, category: "県庁所在地", type: "choice",
    question: "石川県の県庁所在地はどこ？",
    answer: "金沢市", choices: ["金沢市", "石川市", "小松市", "加賀市"]
  },
  {
    id: 9, category: "県庁所在地", type: "choice",
    question: "福井県の県庁所在地はどこ？",
    answer: "福井市", choices: ["福井市", "敦賀市", "鯖江市", "越前市"]
  },
  {
    id: 10, category: "県庁所在地", type: "choice",
    question: "山梨県の県庁所在地はどこ？",
    answer: "甲府市", choices: ["甲府市", "山梨市", "富士吉田市", "大月市"]
  },
  {
    id: 11, category: "県庁所在地", type: "choice",
    question: "愛知県の県庁所在地はどこ？",
    answer: "名古屋市", choices: ["名古屋市", "豊田市", "岡崎市", "一宮市"]
  },
  {
    id: 12, category: "県庁所在地", type: "choice",
    question: "三重県の県庁所在地はどこ？",
    answer: "津市", choices: ["津市", "三重市", "四日市市", "伊勢市"]
  },
  {
    id: 13, category: "県庁所在地", type: "choice",
    question: "滋賀県の県庁所在地はどこ？",
    answer: "大津市", choices: ["大津市", "滋賀市", "近江八幡市", "草津市"]
  },
  {
    id: 14, category: "県庁所在地", type: "choice",
    question: "兵庫県の県庁所在地はどこ？",
    answer: "神戸市", choices: ["神戸市", "兵庫市", "姫路市", "西宮市"]
  },
  {
    id: 15, category: "県庁所在地", type: "choice",
    question: "奈良県の県庁所在地はどこ？",
    answer: "奈良市", choices: ["奈良市", "橿原市", "生駒市", "天理市"]
  },
  {
    id: 16, category: "県庁所在地", type: "choice",
    question: "和歌山県の県庁所在地はどこ？",
    answer: "和歌山市", choices: ["和歌山市", "新宮市", "田辺市", "海南市"]
  },
  {
    id: 17, category: "県庁所在地", type: "choice",
    question: "島根県の県庁所在地はどこ？",
    answer: "松江市", choices: ["松江市", "島根市", "出雲市", "浜田市"]
  },
  {
    id: 18, category: "県庁所在地", type: "choice",
    question: "香川県の県庁所在地はどこ？",
    answer: "高松市", choices: ["高松市", "香川市", "丸亀市", "坂出市"]
  },
  {
    id: 19, category: "県庁所在地", type: "choice",
    question: "愛媛県の県庁所在地はどこ？",
    answer: "松山市", choices: ["松山市", "愛媛市", "今治市", "新居浜市"]
  },
  {
    id: 20, category: "県庁所在地", type: "choice",
    question: "高知県の県庁所在地はどこ？",
    answer: "高知市", choices: ["高知市", "南国市", "四万十市", "土佐市"]
  },
  {
    id: 21, category: "県庁所在地", type: "choice",
    question: "福岡県の県庁所在地はどこ？",
    answer: "福岡市", choices: ["福岡市", "北九州市", "久留米市", "博多市"]
  },
  {
    id: 22, category: "県庁所在地", type: "choice",
    question: "佐賀県の県庁所在地はどこ？",
    answer: "佐賀市", choices: ["佐賀市", "唐津市", "鳥栖市", "伊万里市"]
  },
  {
    id: 23, category: "県庁所在地", type: "choice",
    question: "長崎県の県庁所在地はどこ？",
    answer: "長崎市", choices: ["長崎市", "佐世保市", "諫早市", "大村市"]
  },
  {
    id: 24, category: "県庁所在地", type: "choice",
    question: "熊本県の県庁所在地はどこ？",
    answer: "熊本市", choices: ["熊本市", "八代市", "阿蘇市", "天草市"]
  },
  {
    id: 25, category: "県庁所在地", type: "choice",
    question: "沖縄県の県庁所在地はどこ？",
    answer: "那覇市", choices: ["那覇市", "沖縄市", "石垣市", "名護市"]
  },
  // ========== 夏の星座（4択） ==========
  {
    id: 26, category: "夏の星座", type: "choice",
    question: "夏の大三角を作る、こと座の一等星は？",
    answer: "ベガ", choices: ["ベガ", "アルタイル", "デネブ", "シリウス"]
  },
  {
    id: 27, category: "夏の星座", type: "choice",
    question: "夏の大三角を作る、わし座の一等星は？",
    answer: "アルタイル", choices: ["アルタイル", "ベガ", "デネブ", "アンタレス"]
  },
  {
    id: 28, category: "夏の星座", type: "choice",
    question: "夏の大三角を作る、はくちょう座の一等星は？",
    answer: "デネブ", choices: ["デネブ", "ベガ", "アルタイル", "プロキオン"]
  },
  // ========== 冬の星座（4択） ==========
  {
    id: 29, category: "冬の星座", type: "choice",
    question: "冬の大三角を作る、オリオン座の赤い一等星は？",
    answer: "ベテルギウス", choices: ["ベテルギウス", "シリウス", "プロキオン", "リゲル"]
  },
  {
    id: 30, category: "冬の星座", type: "choice",
    question: "冬の大三角を作る、おおいぬ座の青白い一等星は？",
    answer: "シリウス", choices: ["シリウス", "ベテルギウス", "プロキオン", "デネブ"]
  },
  {
    id: 31, category: "冬の星座", type: "choice",
    question: "冬の大三角を作る、こいぬ座の一等星は？",
    answer: "プロキオン", choices: ["プロキオン", "シリウス", "ベテルギウス", "ベガ"]
  },
  {
    id: 32, category: "冬の星座", type: "choice",
    question: "オリオン座の右下に光る、白色の美しい一等星は？",
    answer: "リゲル", choices: ["リゲル", "ベテルギウス", "シリウス", "カペラ"]
  },
  // ========== 北の星座・月・天体（4択） ==========
  {
    id: 33, category: "北の星座", type: "choice",
    question: "北の空に見える、ひしゃくの形をした7つの星の集まりは？",
    answer: "北斗七星", choices: ["北斗七星", "南十字星", "カシオペヤ座", "オリオン座"]
  },
  {
    id: 34, category: "北の星座", type: "choice",
    question: "北の空でほとんど動かない、真北を指す星は？",
    answer: "北極星", choices: ["北極星", "シリウス", "ベガ", "太陽"]
  },
  {
    id: 35, category: "月の動き", type: "choice",
    question: "夕方、西の空に見える、弓の形をした細い月は？",
    answer: "三日月", choices: ["三日月", "満月", "半月", "新月"]
  },
  {
    id: 36, category: "天体の動き", type: "choice",
    question: "太陽や星が、1日に1回地球のまわりを回るように見える動きは？",
    answer: "日周運動", choices: ["日周運動", "年周運動", "公転", "自転"]
  },
  {
    id: 37, category: "天体の動き", type: "choice",
    question: "月が地球のまわりを1周するのにかかる日数は、約何日間？",
    answer: "約30日間", choices: ["約30日間", "約7日間", "約15日間", "約365日間"]
  },
  {
    id: 38, category: "太陽の動き", type: "choice",
    question: "太陽が1日の中で最も高く上がり、真南にくることを何という？",
    answer: "南中", choices: ["南中", "日の出", "日の入り", "南下"]
  },
  // ========== 天気（4択） ==========
  {
    id: 39, category: "天気", type: "choice",
    question: "1日のうち、気温が一番高くなるのは午後何時ごろ？",
    answer: "午後2時ごろ", choices: ["午後2時ごろ", "正午（12時）", "午後4時ごろ", "午前10時ごろ"]
  },
  {
    id: 40, category: "天気", type: "choice",
    question: "日本の天気は、一般的にどの方角からどの方角へ変わる？",
    answer: "西から東", choices: ["西から東", "東から西", "南から北", "北から南"]
  },
  // ========== 算数単位（4択） ==========
  {
    id: 41, category: "算数単位", type: "choice",
    question: "1アール（a）は、何平方メートル（㎡）？",
    answer: "100㎡", choices: ["100㎡", "10㎡", "1000㎡", "10000㎡"]
  },
  {
    id: 42, category: "算数単位", type: "choice",
    question: "1ヘクタール（ha）は、何平方メートル（㎡）？",
    answer: "10000㎡", choices: ["10000㎡", "100㎡", "1000㎡", "100000㎡"]
  },
  {
    id: 43, category: "算数単位", type: "choice",
    question: "1ヘクタール（ha）は、何アール（a）？",
    answer: "100a", choices: ["100a", "10a", "1000a", "10000a"]
  },
  {
    id: 44, category: "算数単位", type: "choice",
    question: "1平方キロメートル（㎢）は、何ヘクタール（ha）？",
    answer: "100ha", choices: ["100ha", "10ha", "1000ha", "10000ha"]
  },
  // ========== 国語慣用句（4択） ==========
  {
    id: 45, category: "国語慣用句", type: "choice",
    question: "非常に忙しく、だれでもいいから手伝ってほしい時のことわざは？",
    answer: "猫の手も借りたい", choices: ["猫の手も借りたい", "犬と猿の仲", "馬の耳に念仏", "雀の涙"]
  },
  {
    id: 46, category: "国語慣用句", type: "choice",
    question: "出したものが何も返ってこないこと。「○○の川流れ」？",
    answer: "河童", choices: ["河童", "人魚", "魚", "蛙"]
  },
  {
    id: 47, category: "国語慣用句", type: "choice",
    question: "よいチャンスを逃さず、すぐに行動すること。「鉄は熱いうちに○○」？",
    answer: "打て", choices: ["打て", "鍛えよ", "伸ばせ", "冷ませ"]
  },
  {
    id: 48, category: "国語慣用句", type: "choice",
    question: "わずかなお金や、ほんの少しの量のことをたとえて何という？",
    answer: "雀の涙", choices: ["雀の涙", "猫の額", "蚊の涙", "蟻の足"]
  },
  // ========== 国語画数（4択） ==========
  {
    id: 49, category: "国語画数", type: "choice",
    question: "「潟（がた）」の右上の部分の正しい漢字は？",
    answer: "臼", choices: ["臼", "白", "日", "目"]
  },
  {
    id: 50, category: "国語画数", type: "choice",
    question: "「媛（ひめ）」の右側の上の部分の正しい漢字は？",
    answer: "ツ", choices: ["ツ", "ク", "十", "艹"]
  },

  // ========== 算数計算（4択） ==========
  {
    id: 51, category: "算数計算", type: "choice",
    question: "26 × 8 はいくつ？",
    answer: "208", choices: ["208", "196", "218", "198"]
  },
  {
    id: 52, category: "算数計算", type: "choice",
    question: "144 ÷ 9 はいくつ？",
    answer: "16", choices: ["16", "14", "18", "12"]
  },
  {
    id: 53, category: "算数計算", type: "choice",
    question: "縦6cm、横7cmの長方形の面積は？",
    answer: "42㎠", choices: ["42㎠", "36㎠", "48㎠", "40㎠"]
  },
  {
    id: 54, category: "算数計算", type: "choice",
    question: "1辺が9cmの正方形の面積は？",
    answer: "81㎠", choices: ["81㎠", "72㎠", "90㎠", "64㎠"]
  },
  {
    id: 55, category: "算数計算", type: "choice",
    question: "小数 1.7 + 2.3 はいくつ？",
    answer: "4", choices: ["4", "3.9", "4.1", "5"]
  },
  {
    id: 56, category: "算数計算", type: "choice",
    question: "直角の大きさは何度？",
    answer: "90度", choices: ["90度", "45度", "180度", "60度"]
  },
  {
    id: 57, category: "算数計算", type: "choice",
    question: "三角形の3つの角の大きさをたすと何度になる？",
    answer: "180度", choices: ["180度", "90度", "270度", "360度"]
  },
  {
    id: 58, category: "算数計算", type: "choice",
    question: "四角形の4つの角の大きさをたすと何度になる？",
    answer: "360度", choices: ["360度", "180度", "270度", "90度"]
  },
  {
    id: 59, category: "算数計算", type: "choice",
    question: "10000m は何km？",
    answer: "10km", choices: ["10km", "100km", "1km", "1000km"]
  },
  {
    id: 60, category: "算数計算", type: "choice",
    question: "1km は何m？",
    answer: "1000m", choices: ["1000m", "100m", "10000m", "10m"]
  },
  {
    id: 61, category: "算数計算", type: "choice",
    question: "135 × 4 はいくつ？",
    answer: "540", choices: ["540", "530", "550", "520"]
  },
  {
    id: 62, category: "算数計算", type: "choice",
    question: "360 ÷ 9 はいくつ？",
    answer: "40", choices: ["40", "30", "50", "36"]
  },

  // ========== 英語カタカナ（入力 — カタカナで読みを入力） ==========
  {
    id: 101, category: "英語カタカナ", type: "input",
    question: "ねこ cat を英語で言うと？カタカナで",
    answer: "キャット", hint: "キャ"
  },
  {
    id: 102, category: "英語カタカナ", type: "input",
    question: "いぬ dog を英語で言うと？カタカナで",
    answer: "ドッグ", hint: "ド"
  },
  {
    id: 103, category: "英語カタカナ", type: "input",
    question: "はしる run を英語で言うと？カタカナで",
    answer: "ラン", hint: "ラ"
  },
  {
    id: 104, category: "英語カタカナ", type: "input",
    question: "とぶ jump を英語で言うと？カタカナで",
    answer: "ジャンプ", hint: "ジャ"
  },
  {
    id: 105, category: "英語カタカナ", type: "input",
    question: "ほん book を英語で言うと？カタカナで",
    answer: "ブック", hint: "ブ"
  },
  {
    id: 106, category: "英語カタカナ", type: "input",
    question: "かぎ key を英語で言うと？カタカナで",
    answer: "キー", hint: "キ"
  },
  {
    id: 107, category: "英語カタカナ", type: "input",
    question: "あか red を英語で言うと？カタカナで",
    answer: "レッド", hint: "レ"
  },
  {
    id: 108, category: "英語カタカナ", type: "input",
    question: "あお blue を英語で言うと？カタカナで",
    answer: "ブルー", hint: "ブ"
  },
  {
    id: 109, category: "英語カタカナ", type: "input",
    question: "つくえ desk を英語で言うと？カタカナで",
    answer: "デスク", hint: "デ"
  },
  {
    id: 110, category: "英語カタカナ", type: "input",
    question: "ペン pen を英語で言うと？カタカナで",
    answer: "ペン", hint: "ペ"
  },
  {
    id: 111, category: "英語カタカナ", type: "input",
    question: "て hand を英語で言うと？カタカナで",
    answer: "ハンド", hint: "ハ"
  },
  {
    id: 112, category: "英語カタカナ", type: "input",
    question: "たべもの food を英語で言うと？カタカナで",
    answer: "フード", hint: "フ"
  },
  {
    id: 113, category: "英語カタカナ", type: "input",
    question: "コップ cup を英語で言うと？カタカナで",
    answer: "カップ", hint: "カ"
  },
  {
    id: 114, category: "英語カタカナ", type: "input",
    question: "かばん bag を英語で言うと？カタカナで",
    answer: "バッグ", hint: "バ"
  },
  {
    id: 115, category: "英語カタカナ", type: "input",
    question: "みどり green を英語で言うと？カタカナで",
    answer: "グリーン", hint: "グ"
  },
  {
    id: 116, category: "英語カタカナ", type: "input",
    question: "いえ house を英語で言うと？カタカナで",
    answer: "ハウス", hint: "ハ"
  },
  {
    id: 117, category: "英語カタカナ", type: "input",
    question: "でんしゃ train を英語で言うと？カタカナで",
    answer: "トレイン", hint: "ト"
  },
  {
    id: 118, category: "英語カタカナ", type: "input",
    question: "ゲーム game を英語で言うと？カタカナで",
    answer: "ゲーム", hint: "ゲ"
  },
  {
    id: 119, category: "英語カタカナ", type: "input",
    question: "あそぶ play を英語で言うと？カタカナで",
    answer: "プレイ", hint: "プ"
  },
  {
    id: 120, category: "英語カタカナ", type: "input",
    question: "りんご apple を英語で言うと？カタカナで",
    answer: "アップル", hint: "ア"
  },
  {
    id: 121, category: "英語カタカナ", type: "input",
    question: "みず water を英語で言うと？カタカナで",
    answer: "ウォーター", hint: "ウ"
  },
  {
    id: 122, category: "英語カタカナ", type: "input",
    question: "とり bird を英語で言うと？カタカナで",
    answer: "バード", hint: "バ"
  },
  {
    id: 123, category: "英語カタカナ", type: "input",
    question: "さかな fish を英語で言うと？カタカナで",
    answer: "フィッシュ", hint: "フ"
  },
  {
    id: 124, category: "英語カタカナ", type: "input",
    question: "ともだち friend を英語で言うと？カタカナで",
    answer: "フレンド", hint: "フ"
  },
  {
    id: 125, category: "英語カタカナ", type: "input",
    question: "かぞく family を英語で言うと？カタカナで",
    answer: "ファミリー", hint: "ファ"
  },
  {
    id: 126, category: "英語カタカナ", type: "input",
    question: "うれしい happy を英語で言うと？カタカナで",
    answer: "ハッピー", hint: "ハ"
  },
  {
    id: 127, category: "英語カタカナ", type: "input",
    question: "くだもの fruit を英語で言うと？カタカナで",
    answer: "フルーツ", hint: "フ"
  },
  {
    id: 128, category: "英語カタカナ", type: "input",
    question: "なつ summer を英語で言うと？カタカナで",
    answer: "サマー", hint: "サ"
  },
  {
    id: 129, category: "英語カタカナ", type: "input",
    question: "たいよう sun を英語で言うと？カタカナで",
    answer: "サン", hint: "サ"
  },
  {
    id: 130, category: "英語カタカナ", type: "input",
    question: "つき moon を英語で言うと？カタカナで",
    answer: "ムーン", hint: "ム"
  },
  {
    id: 131, category: "英語カタカナ", type: "input",
    question: "ほし star を英語で言うと？カタカナで",
    answer: "スター", hint: "ス"
  },
  {
    id: 132, category: "英語カタカナ", type: "input",
    question: "どうぶつ animal を英語で言うと？カタカナで",
    answer: "アニマル", hint: "ア"
  },
  {
    id: 133, category: "英語カタカナ", type: "input",
    question: "バナナ banana を英語で言うと？カタカナで",
    answer: "バナナ", hint: "バ"
  },
  {
    id: 134, category: "英語カタカナ", type: "input",
    question: "せんせい teacher を英語で言うと？カタカナで",
    answer: "ティーチャー", hint: "ティ"
  },
  {
    id: 135, category: "英語カタカナ", type: "input",
    question: "がっこう school を英語で言うと？カタカナで",
    answer: "スクール", hint: "ス"
  },
  {
    id: 136, category: "英語カタカナ", type: "input",
    question: "サッカー soccer を英語で言うと？カタカナで",
    answer: "サッカー", hint: "サ"
  },
  {
    id: 137, category: "英語カタカナ", type: "input",
    question: "かわ river を英語で言うと？カタカナで",
    answer: "リバー", hint: "リ"
  },
  {
    id: 138, category: "英語カタカナ", type: "input",
    question: "き tree を英語で言うと？カタカナで",
    answer: "ツリー", hint: "ツ"
  },
  {
    id: 139, category: "英語カタカナ", type: "input",
    question: "コンピューター computer を英語で言うと？カタカナで",
    answer: "コンピューター", hint: "コ"
  },
  {
    id: 140, category: "英語カタカナ", type: "input",
    question: "やきゅう baseball を英語で言うと？カタカナで",
    answer: "ベースボール", hint: "ベ"
  },
  {
    id: 141, category: "英語カタカナ", type: "input",
    question: "てんき weather を英語で言うと？カタカナで",
    answer: "ウェザー", hint: "ウェ"
  },
  {
    id: 142, category: "英語カタカナ", type: "input",
    question: "たからもの treasure を英語で言うと？カタカナで",
    answer: "トレジャー", hint: "ト"
  },

  // ========== 算数計算（入力 — 数字で答える） ==========
  {
    id: 201, category: "算数計算", type: "input",
    question: "25 × 4 = ?　（数字だけ入力）",
    answer: "100"
  },
  {
    id: 202, category: "算数計算", type: "input",
    question: "63 ÷ 9 = ?　（数字だけ入力）",
    answer: "7"
  },
  {
    id: 203, category: "算数計算", type: "input",
    question: "18 × 6 = ?　（数字だけ入力）",
    answer: "108"
  },
  {
    id: 204, category: "算数計算", type: "input",
    question: "96 ÷ 8 = ?　（数字だけ入力）",
    answer: "12"
  },
  {
    id: 205, category: "算数計算", type: "input",
    question: "0.4 + 0.5 = ?　（数字だけ入力）",
    answer: "0.9"
  },
  {
    id: 206, category: "算数計算", type: "input",
    question: "2.7 - 1.4 = ?　（数字だけ入力）",
    answer: "1.3"
  },
  {
    id: 207, category: "算数計算", type: "input",
    question: "縦4cm × 横9cm の長方形の面積は？（数字だけ入力）",
    answer: "36"
  },
  {
    id: 208, category: "算数計算", type: "input",
    question: "1辺が7cmの正方形の面積は？（数字だけ入力）",
    answer: "49"
  },
  {
    id: 209, category: "算数計算", type: "input",
    question: "500 × 6 = ?　（数字だけ入力）",
    answer: "3000"
  },
  {
    id: 210, category: "算数計算", type: "input",
    question: "480 ÷ 6 = ?　（数字だけ入力）",
    answer: "80"
  },
  {
    id: 211, category: "算数計算", type: "input",
    question: "1000 - 375 = ?　（数字だけ入力）",
    answer: "625"
  },
  {
    id: 212, category: "算数計算", type: "input",
    question: "縦8cm × 横5cm の長方形の面積は？（数字だけ入力）",
    answer: "40"
  },
  {
    id: 213, category: "算数計算", type: "input",
    question: "37 × 3 = ?　（数字だけ入力）",
    answer: "111"
  },
  {
    id: 214, category: "算数計算", type: "input",
    question: "168 ÷ 7 = ?　（数字だけ入力）",
    answer: "24"
  },
];

export const setDefaultQuestions = (data) => {
  QUESTIONS_DB = data;
};

// =============================
// カスタム問題の取得
// =============================
export const getCustomQuestions = () => {
  try {
    const data = localStorage.getItem('learning_rpg_custom_questions');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

// =============================
// ランダムに問題を1つ選ぶ
// reviewIds: まちがえた問題のID一覧（30%の確率で再出題）
// =============================
export const getRandomQuestion = (floor = 1, reviewIds = []) => {
  console.debug(floor);
  let selected;
  const customQuestions = getCustomQuestions();
  const allQuestions = customQuestions.length > 0 ? customQuestions : QUESTIONS_DB;

  // 30%の確率でまちがえた問題を再出題
  if (reviewIds.length > 0 && Math.random() < 0.3) {
    const reviewPool = allQuestions.filter(q => reviewIds.includes(q.id));
    if (reviewPool.length > 0) {
      selected = reviewPool[Math.floor(Math.random() * reviewPool.length)];
    }
  }

  // それ以外はランダム
  if (!selected) {
    selected = allQuestions[Math.floor(Math.random() * allQuestions.length)];
  }

  // 4択の場合は選択肢をシャッフル
  if (selected.type === 'choice') {
    const shuffledChoices = [...selected.choices].sort(() => Math.random() - 0.5);
    return { ...selected, shuffledChoices };
  }

  return { ...selected };
};

// =============================
// 答えの比較ロジック
// カタカナ↔ひらがなを正規化して比較
// 数字は数値として比較（3 === 3.0 など）
// =============================
export const checkAnswer = (typed, questionObj) => {
  const trimmedTyped = typed.trim();
  const trimmedCorrect = questionObj.answer.trim();

  if (questionObj.category === '算数計算') {
    // 数値として比較（小数の揺れを吸収）
    const typedNum = parseFloat(trimmedTyped);
    const correctNum = parseFloat(trimmedCorrect);
    if (!isNaN(typedNum) && !isNaN(correctNum)) {
      return Math.abs(typedNum - correctNum) < 0.0001;
    }
    return trimmedTyped === trimmedCorrect;
  }

  // カタカナ・ひらがなを同一視して比較
  const toHiragana = (s) =>
    s.replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return toHiragana(trimmedTyped) === toHiragana(trimmedCorrect);
};
