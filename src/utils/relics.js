export const RELICS_DB = {
  strength_ring: {
    key: 'strength_ring',
    name: 'ちからのうでわ',
    desc: '毎ターン開始時、筋力+1を得る。',
    price: 150
  },
  iron_shield: {
    key: 'iron_shield',
    name: 'まもりのたて',
    desc: 'バトル開始時、ブロック+5を得る。',
    price: 120
  },
  king_crown: {
    key: 'king_crown',
    name: 'おうさまの王冠',
    desc: '毎ターン引くカードの枚数が+1される。',
    price: 250
  },
  vampire_tooth: {
    key: 'vampire_tooth',
    name: 'きゅうけつきのキバ',
    desc: '戦闘勝利時、HPを3回復する。',
    price: 180
  },
  lucky_coin: {
    key: 'lucky_coin',
    name: 'ラッキーコイン',
    desc: '敵が落とすゴールドが20%増える。',
    price: 100
  }
};

export const getRandomRelic = (excludeList = []) => {
  const keys = Object.keys(RELICS_DB).filter(k => !excludeList.includes(k));
  if (keys.length === 0) return null;
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { ...RELICS_DB[key] };
};
