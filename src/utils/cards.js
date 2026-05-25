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
    rarity: "common",
    desc: (upgraded) => `じぶんの HPを ${upgraded ? 15 : 9} かいふくする。`,
    effect: (player, target, upgraded, stateHelpers) => {
      const hpVal = upgraded ? 15 : 9;
      stateHelpers.heal(hpVal);
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

// さいしょのデッキ（こうげき 4枚、ぼうぎょ 4枚、かいふく 2枚）
export const generateStarterDeck = () => {
  const deck = [];
  for (let i = 0; i < 4; i++) {
    deck.push(createCardInstance('strike'));
  }
  for (let i = 0; i < 4; i++) {
    deck.push(createCardInstance('defend'));
  }
  for (let i = 0; i < 2; i++) {
    deck.push(createCardInstance('heal'));
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
