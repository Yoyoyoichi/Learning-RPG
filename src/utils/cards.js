// じどうしゃやゲームなど、しょうがく4ねんせいでもわかるシンプルなカードデータ
export const CARDS_DB = {
  strike: {
    key: 'strike',
    name: "こうげき",
    type: "attack",
    cost: 1,
    rarity: "starter",
    desc: (upgraded) => `てきに ${upgraded ? 10 : 6} ダメージを あたえる。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const dmg = upgraded ? 10 : 6;
      stateHelpers.dealDamage(dmg, target);
    }
  },
  defend: {
    key: 'defend',
    name: "ぼうぎょ",
    type: "skill",
    cost: 1,
    rarity: "starter",
    desc: (upgraded) => `ブロックを ${upgraded ? 8 : 5} える。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const blk = upgraded ? 8 : 5;
      stateHelpers.gainBlock(blk);
    }
  },
  heal: {
    key: 'heal',
    name: "かいふく",
    type: "skill",
    cost: 1,
    rarity: "starter",
    desc: (upgraded) => `じぶんの HPを ${upgraded ? 7 : 4} かいふくする。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const hpVal = upgraded ? 7 : 4;
      stateHelpers.heal(hpVal);
    }
  },
  heavy_strike: {
    key: 'heavy_strike',
    name: "つよいこうげき",
    type: "attack",
    cost: 1,
    rarity: "common",
    desc: (upgraded) => `てきに ${upgraded ? 18 : 12} ダメージを あたえる。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const dmg = upgraded ? 18 : 12;
      stateHelpers.dealDamage(dmg, target);
    }
  },
  iron_shield: {
    key: 'iron_shield',
    name: "てっぺきのまもり",
    type: "skill",
    cost: 1,
    rarity: "common",
    desc: (upgraded) => `ブロックを ${upgraded ? 15 : 10} える。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const blk = upgraded ? 15 : 10;
      stateHelpers.gainBlock(blk);
    }
  },
  mega_heal: {
    key: 'mega_heal',
    name: "だいかいふく",
    type: "skill",
    cost: 1,
    rarity: "rare",
    desc: (upgraded) => `じぶんの HPを ${upgraded ? 15 : 9} かいふくする。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const hpVal = upgraded ? 15 : 9;
      stateHelpers.heal(hpVal);
    }
  },
  poison_flask: {
    key: 'poison_flask',
    name: "どくのビン",
    type: "skill",
    cost: 1,
    rarity: "common",
    desc: (upgraded) => `てきに ${upgraded ? 7 : 5} の「どく」をあたえる。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const p = upgraded ? 7 : 5;
      stateHelpers.applyStatus(target, 'poison', p);
    }
  },
  vampire_bite: {
    key: 'vampire_bite',
    name: "きゅうけつ",
    type: "attack",
    cost: 1,
    rarity: "rare",
    desc: (upgraded) => `てきに ${upgraded ? 5 : 3} ダメージ。 ${upgraded ? 3 : 2} 回復。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const d = upgraded ? 5 : 3;
      stateHelpers.dealDamage(d, target);
      stateHelpers.heal(upgraded ? 3 : 2);
    }
  },
  shield_bash: {
    key: 'shield_bash',
    name: "シールドバッシュ",
    type: "attack",
    cost: 1,
    rarity: "uncommon",
    desc: (upgraded) => `じぶんのブロックとおなじダメージをあたえる。${upgraded ? 'その後、5ブロックを得る。' : ''}`,
    effect: (player, target, upgraded, stateHelpers) => {
      // Need a way to read current block, we'll pass player to dealDamage/etc later or use stateHelpers.
      // Wait, effect signature is (player, target, upgraded, stateHelpers). Player has playerBlock?
      // In QuizOverlay, we should ensure `player` passed to effect contains `block` or just use stateHelpers.
      // Let's assume stateHelpers.getCurrentBlock() or just pass the full battle state.
      stateHelpers.dealDamage('block', target); 
      if (upgraded) {
        stateHelpers.gainBlock(5);
      }
    }
  },
  quick_draw: {
    key: 'quick_draw',
    name: "はやわざ",
    type: "skill",
    cost: 0,
    rarity: "uncommon",
    desc: (upgraded) => `カードを ${upgraded ? 2 : 1} 枚ひく。`,
    effect: (player, target, upgraded, stateHelpers) => {
      stateHelpers.drawCards(upgraded ? 2 : 1);
    }
  },
  heavy_blade: {
    key: 'heavy_blade',
    name: "ヘビーブレード",
    type: "attack",
    cost: 2, // will need energy system, but for now we don't have cost enforced strictly unless we do it. Wait, cost is 1 for all so far. Let's make it 1 but require an action or just high damage.
    rarity: "uncommon",
    desc: (upgraded) => `てきに ${upgraded ? 25 : 18} ダメージ。「すじりょく」のこうかが ${upgraded ? 5 : 3} 倍になる。`,
    effect: (player, target, upgraded, stateHelpers) => {
      // For now, simple massive damage. We'll handle strength scaling in stateHelpers.dealDamage
      stateHelpers.dealDamage(upgraded ? 25 : 18, target, { strengthMultiplier: upgraded ? 5 : 3 });
    }
  }
};

// カードのじっさいのオブジェクトをつくるヘルパー
let cardIdCounter = 0;
export const createCardInstance = (key, upgraded = false) => {
  const cardData = CARDS_DB[key];
  if (!cardData) return null;
  
  const cost = typeof cardData.cost === 'function' ? cardData.cost(upgraded) : cardData.cost;
  
  return {
    id: `card_${cardIdCounter++}_${Date.now()}`,
    key: cardData.key,
    name: cardData.name + (upgraded ? '+' : ''),
    type: cardData.type,
    cost: cost,
    rarity: cardData.rarity,
    desc: cardData.desc(upgraded),
    upgraded: upgraded,
    exhaust: false
  };
};

export const generateStarterDeck = () => {
  const deck = [];
  for (let i = 0; i < 5; i++) {
    deck.push(createCardInstance('strike'));
  }
  for (let i = 0; i < 5; i++) {
    deck.push(createCardInstance('defend'));
  }
  return deck;
};

// てきをたおしたときにもらえるカード（こうげき・ぼうぎょ・かいふく 以外のカードからえらぶ）
export const getRandomRewardCards = (floor) => {
  const pool = Object.keys(CARDS_DB).filter(k => CARDS_DB[k].rarity !== 'starter');
  const selectedKeys = [];
  
  while (selectedKeys.length < 3) {
    const randomKey = pool[Math.floor(Math.random() * pool.length)];
    if (!selectedKeys.includes(randomKey)) {
      selectedKeys.push(randomKey);
    }
  }
  
  const upgradeChance = 0.1 * floor;
  
  return selectedKeys.map(key => {
    const isUpgraded = Math.random() < upgradeChance;
    return createCardInstance(key, isUpgraded);
  });
};
