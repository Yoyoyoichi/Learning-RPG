// しょうがくせい（4ねんせい）むけの やさしい英単語リスト（1階〜5階）
export const DEFAULT_WORDS = {
  1: [
    { word: "cat", meaning: "ねこ" },
    { word: "dog", meaning: "いぬ" },
    { word: "run", meaning: "はしる" },
    { word: "jump", meaning: "とぶ、ジャンプ" },
    { word: "book", meaning: "ほん" },
    { word: "key", meaning: "かぎ" },
    { word: "red", meaning: "あか" },
    { word: "blue", meaning: "あお" },
    { word: "desk", meaning: "つくえ" },
    { word: "pen", meaning: "ペン" },
    { word: "hand", meaning: "て" },
    { word: "food", meaning: "たべもの" },
    { word: "cup", meaning: "コップ" },
    { word: "bag", meaning: "かばん" }
  ],
  2: [
    { word: "green", meaning: "みどり" },
    { word: "white", meaning: "しろ" },
    { word: "black", meaning: "くろ" },
    { word: "house", meaning: "いえ" },
    { word: "room", meaning: "へや" },
    { word: "study", meaning: "べんきょうする" },
    { word: "train", meaning: "でんしゃ" },
    { word: "plane", meaning: "ひこうき" },
    { word: "game", meaning: "ゲーム" },
    { word: "play", meaning: "あそぶ" },
    { word: "apple", meaning: "りんご" },
    { word: "milk", meaning: "ぎゅうにゅう" },
    { word: "water", meaning: "みず" },
    { word: "bird", meaning: "とり" },
    { word: "fish", meaning: "さかな" }
  ],
  3: [
    { word: "friend", meaning: "ともだち" },
    { word: "family", meaning: "かぞく" },
    { word: "father", meaning: "おとうさん" },
    { word: "mother", meaning: "おかあさん" },
    { word: "happy", meaning: "うれしい、しあわせ" },
    { word: "angry", meaning: "おこる" },
    { word: "sad", meaning: "かなしい" },
    { word: "sweet", meaning: "あまい" },
    { word: "fruit", meaning: "くだもの" },
    { word: "summer", meaning: "なつ" },
    { word: "winter", meaning: "ふゆ" },
    { word: "sun", meaning: "たいよう" },
    { word: "moon", meaning: "つき" },
    { word: "star", meaning: "ほし" }
  ],
  4: [
    { word: "animal", meaning: "どうぶつ" },
    { word: "banana", meaning: "バナナ" },
    { word: "orange", meaning: "オレンジ" },
    { word: "yellow", meaning: "きいろ" },
    { word: "purple", meaning: "むらさき" },
    { word: "doctor", meaning: "いしゃ" },
    { word: "teacher", meaning: "せんせい" },
    { word: "school", meaning: "がっこう" },
    { word: "window", meaning: "まど" },
    { word: "soccer", meaning: "サッカー" },
    { word: "tennis", meaning: "テニス" },
    { word: "river", meaning: "かわ" },
    { word: "tree", meaning: "き" }
  ],
  5: [
    { word: "computer", meaning: "コンピューター" },
    { word: "baseball", meaning: "やきゅう" },
    { word: "elephant", meaning: "ぞう" },
    { word: "dinosaur", meaning: "きょうりゅう" },
    { word: "mountain", meaning: "やま" },
    { word: "rainbow", meaning: "にじ" },
    { word: "weather", meaning: "てんき" },
    { word: "beautiful", meaning: "うつくしい" },
    { word: "delicious", meaning: "おいしい" },
    { word: "treasure", meaning: "たからもの" }
  ]
};

// ランダムに単語を選ぶヘルパー
export const getRandomWord = (floor, customWords = [], reviewWords = []) => {
  const currentFloor = Math.max(1, Math.min(5, floor));
  
  // 30% の確率で間違えた単語を復習問題として出す
  if (reviewWords.length > 0 && Math.random() < 0.3) {
    const randomIdx = Math.floor(Math.random() * reviewWords.length);
    return reviewWords[randomIdx];
  }

  // カスタム単語があればそれを使う
  if (customWords && customWords.length > 0) {
    const randomIdx = Math.floor(Math.random() * customWords.length);
    return customWords[randomIdx];
  }

  // なければその階層のデフォルト単語から選ぶ
  const pool = DEFAULT_WORDS[currentFloor] || DEFAULT_WORDS[1];
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
};

// 英語のヒントをつくる (例: "c _ _ t" など)
export const generateHiddenWordHint = (word, level = 1) => {
  if (!word) return "";
  const chars = word.split("");
  
  if (chars.length <= 2) {
    return chars.map(() => "_").join(" ");
  }

  const result = chars.map((char, index) => {
    if (char === " " || char === "-") return char;

    if (level === 1 && index === 0) {
      return char; // 最初の一文字だけ表示
    }
    
    if (level >= 2 && (index === 0 || index === chars.length - 1)) {
      return char; // 最初と最後の文字を表示
    }
    
    return "_";
  });

  return result.join(" ");
};
