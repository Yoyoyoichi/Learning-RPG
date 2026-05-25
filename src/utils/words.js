// Default English vocabulary bank categorized by floor difficulty (B1F - B5F)
export const DEFAULT_WORDS = {
  1: [
    { word: "run", meaning: "走る" },
    { word: "jump", meaning: "跳ぶ、ジャンプする" },
    { word: "cat", meaning: "猫" },
    { word: "dog", meaning: "犬" },
    { word: "book", meaning: "本" },
    { word: "sword", meaning: "剣" },
    { word: "shield", meaning: "盾" },
    { word: "hero", meaning: "英雄、主人公" },
    { word: "gold", meaning: "金、ゴールド" },
    { word: "fight", meaning: "戦う" },
    { word: "key", meaning: "鍵" },
    { word: "door", meaning: "ドア、扉" },
    { word: "floor", meaning: "床、階層" },
    { word: "wall", meaning: "壁" }
  ],
  2: [
    { word: "battle", meaning: "戦闘、戦い" },
    { word: "defeat", meaning: "打ち負かす、敗北" },
    { word: "escape", meaning: "逃げる、脱出する" },
    { word: "potion", meaning: "薬、ポーション" },
    { word: "search", meaning: "探す、探索する" },
    { word: "danger", meaning: "危険" },
    { word: "friend", meaning: "友達、味方" },
    { word: "attack", meaning: "攻撃する" },
    { word: "defend", meaning: "防御する" },
    { word: "shadow", meaning: "影" },
    { word: "forest", meaning: "森、森林" },
    { word: "castle", meaning: "城" }
  ],
  3: [
    { word: "challenge", meaning: "挑戦、課題" },
    { word: "strategy", meaning: "戦略、作戦" },
    { word: "resource", meaning: "資源、リソース" },
    { word: "critical", meaning: "重大な、批判的な、クリティカルな" },
    { word: "dynamic", meaning: "動的な、活発な" },
    { word: "absolute", meaning: "絶対的な、完全な" },
    { word: "vertical", meaning: "垂直の" },
    { word: "horizontal", meaning: "水平の" },
    { word: "victory", meaning: "勝利" },
    { word: "experience", meaning: "経験、体験" },
    { word: "ability", meaning: "能力" },
    { word: "treasure", meaning: "宝、財宝" }
  ],
  4: [
    { word: "accurate", meaning: "正確な" },
    { word: "evaluate", meaning: "評価する" },
    { word: "permanent", meaning: "永久的な、常勤の" },
    { word: "identify", meaning: "特定する、確認する" },
    { word: "equivalent", meaning: "同等の、相当する" },
    { word: "transition", meaning: "移行、移り変わり" },
    { word: "consume", meaning: "消費する" },
    { word: "resolve", meaning: "解決する、決意する" },
    { word: "encounter", meaning: "遭遇する、出会い" },
    { word: "purchase", meaning: "購入する" },
    { word: "inventory", meaning: "目録、インベントリ" },
    { word: "obstacle", meaning: "障害、障害物" }
  ],
  5: [
    { word: "vulnerable", meaning: "脆弱な、傷つきやすい" },
    { word: "simultaneous", meaning: "同時期に起こる、同時の" },
    { word: "configuration", meaning: "構成、設定" },
    { word: "parameter", meaning: "媒介変数、パラメータ" },
    { word: "installation", meaning: "設置、インストール" },
    { word: "implementation", meaning: "実行、実装" },
    { word: "accomplish", meaning: "成し遂げる、達成する" },
    { word: "consequence", meaning: "結果、影響" },
    { word: "predecessor", meaning: "前身、前任者" },
    { word: "substantial", meaning: "かなりの、実質的な" },
    { word: "intervene", meaning: "介入する、邪魔する" },
    { word: "legendary", meaning: "伝説的な、極めて有名な" }
  ]
};

// Select a random word based on floor difficulty and performance
// - customWords: parsed custom words from CSV (if any)
// - reviewWords: list of words the player has recently got wrong
export const getRandomWord = (floor, customWords = [], reviewWords = []) => {
  const currentFloor = Math.max(1, Math.min(5, floor));
  
  // 1. 30% chance to pick a word from reviewWords if available
  if (reviewWords.length > 0 && Math.random() < 0.3) {
    const randomIdx = Math.floor(Math.random() * reviewWords.length);
    return reviewWords[randomIdx];
  }

  // 2. If custom words are loaded, use them
  if (customWords && customWords.length > 0) {
    const randomIdx = Math.floor(Math.random() * customWords.length);
    return customWords[randomIdx];
  }

  // 3. Fallback to default words for the current floor
  const pool = DEFAULT_WORDS[currentFloor] || DEFAULT_WORDS[1];
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
};

// Generates structural hints (e.g. "c _ _ _ _ _ e" for "college")
// - level 0: only show length: "_ _ _ _ _"
// - level 1: show first character: "c _ _ _ _"
// - level 2: show first and last character: "c _ _ _ e"
export const generateHiddenWordHint = (word, level = 1) => {
  if (!word) return "";
  const chars = word.split("");
  
  if (chars.length <= 2) {
    // Very short words: just show underscores
    return chars.map(() => "_").join(" ");
  }

  const result = chars.map((char, index) => {
    // Always preserve spaces or special characters if any
    if (char === " " || char === "-") return char;

    if (level === 1 && index === 0) {
      return char; // Show first character
    }
    
    if (level >= 2 && (index === 0 || index === chars.length - 1)) {
      return char; // Show first and last characters
    }
    
    return "_";
  });

  return result.join(" ");
};
