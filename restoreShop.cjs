const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. imports
if (!content.includes('getRandomRelic')) {
  content = content.replace(
    "import { CARDS_DB, createCardInstance, generateStarterDeck, getRandomRewardCards } from './utils/cards';",
    "import { CARDS_DB, createCardInstance, generateStarterDeck, getRandomRewardCards } from './utils/cards';\nimport { RELICS_DB, getRandomRelic } from './utils/relics';"
  );
  content = content.replace( // Try another pattern if the above fails
    "from './utils/cards';",
    "from './utils/cards';\nimport { RELICS_DB, getRandomRelic } from './utils/relics';"
  );
}

// 2. itemTypes
if (!content.includes("{ subType: 'shop'")) {
  content = content.replace(
    "{ subType: 'chest', char: 'C', name: '宝箱' }",
    "{ subType: 'chest', char: 'C', name: '宝箱' },\n    { subType: 'shop', char: '$$', name: '商人' }"
  );
}

// 3. INITIAL_PLAYER
if (!content.includes("relics: []")) {
  content = content.replace(
    "deck: []",
    "deck: [],\n  relics: []"
  );
}

// 4. shop state
if (!content.includes("const [shop, setShop] = useState(null)")) {
  content = content.replace(
    "const [cardReward, setCardReward] = useState(null);",
    "const [cardReward, setCardReward] = useState(null);\n  const [shop, setShop] = useState(null);"
  );
}

// 5. shop logic in startNewGame
if (!content.includes("setShop(null);")) {
  content = content.replace(
    "setCardReward(null);",
    "setCardReward(null);\n    setShop(null);"
  );
}

// 6. item.subType === 'shop'
if (!content.includes("item.subType === 'shop'")) {
  const shopLogic = `} else if (item.subType === 'shop') {
          setShop({
            cards: getRandomRewardCards(floor),
            relic: getRandomRelic(nextPlayer.relics ? nextPlayer.relics.map(r => r.key) : []),
            removeCost: 50 + (nextPlayer.removedCount || 0) * 25
          });
          addLog('商人に出会った。', 'system');
        } else if (item.subType === 'sword') {`;
  content = content.replace("} else if (item.subType === 'sword') {", shopLogic);
}

// 7. Relics initialBlock
if (!content.includes("r.key === 'iron_shield'")) {
  const blockLogic = `let startingBlock = 0;
      if (player.shieldEquipped) {
        startingBlock += 3;
      }
      if (player.relics && player.relics.some(r => r.key === 'iron_shield')) {
        startingBlock += 5;
      }`;
  content = content.replace(/let startingBlock = 0;\s*if \(player\.shieldEquipped\) \{\s*startingBlock = 3;\s*\}/, blockLogic);
}

// 8. Relics strength
if (!content.includes("strength_ring")) {
  content = content.replace(
    "strength: 0,",
    "strength: (player.relics && player.relics.some(r => r.key === 'strength_ring')) ? 1 : 0,"
  );
}

// 9. Relic gold & healing
if (!content.includes("lucky_coin")) {
  const goldLogic = `setPlayer(nextPlayer);
        
        let actualGold = goldReward;
        if (nextPlayer.relics && nextPlayer.relics.some(r => r.key === 'lucky_coin')) {
          actualGold = Math.floor(actualGold * 1.2);
        }
        
        if (nextPlayer.relics && nextPlayer.relics.some(r => r.key === 'vampire_tooth')) {
          nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + 3);
          addLog("レリック「きゅうけつきのキバ」の効果でHPが3回復した！", 'system');
        }

        setCardReward({
          choices: getRandomRewardCards(nextPlayer.floor),
          gold: actualGold,
          xp: xpReward
        });`;
  content = content.replace(/setPlayer\(nextPlayer\);\s*setCardReward\(\{\s*choices: getRandomRewardCards\(nextPlayer\.floor\),\s*gold: goldReward,\s*xp: xpReward\s*\}\);/, goldLogic);
}

// 10. renderShopContent
if (!content.includes("const renderShopContent = () => {")) {
  const shopFunc = fs.readFileSync('shop.txt', 'utf8');
  content = content.replace("const renderMainGameView = () => {", shopFunc + "\n  const renderMainGameView = () => {");
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
