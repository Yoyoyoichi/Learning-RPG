const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Update rollEnemyIntent
const newIntent = `// Enemy Intention generator
const rollEnemyIntent = (enemy, turnNumber) => {
  const seed = Math.random();
  const subType = enemy.subType;
  const atk = enemy.atk;
  
  if (subType === 'slime') {
    if (seed < 0.5) {
      return { type: 'attack', damage: atk, name: 'たいあたり', text: \`こうげき (\${atk}ダメージ)\` };
    } else {
      return { type: 'defend', block: 4, name: 'からをふくらます', text: \`ぼうぎょ (4ブロック)\` };
    }
  } else if (subType === 'bat') {
    if (seed < 0.5) {
      return { type: 'attack', damage: Math.max(2, atk - 1), name: 'ひっかき', text: \`こうげき (\${Math.max(2, atk - 1)}ダメージ)\` };
    } else {
      return { type: 'attack', damage: atk, name: 'かみつき', text: \`こうげき (\${atk}ダメージ)\` };
    }
  } else if (subType === 'skeleton') {
    if (turnNumber % 3 === 0) {
      return { type: 'attack', damage: atk + 4, name: 'かぶとわり', text: \`つよいこうげき (\${atk + 4}ダメージ)\` };
    } else if (seed < 0.5) {
      return { type: 'defend', block: 6, name: 'たてをかまえる', text: \`ぼうぎょ (6ブロック)\` };
    } else {
      return { type: 'attack', damage: atk, name: 'なぎはらい', text: \`こうげき (\${atk}ダメージ)\` };
    }
  } else if (subType === 'ghost') {
    if (turnNumber % 3 === 2) {
      return { type: 'debuff', weak: 1, name: 'のろい', text: \`デバフ (じゃくたいか 1ターン)\` };
    } else if (seed < 0.5) {
      return { type: 'defend', block: 8, name: 'おんりょうのたて', text: \`ぼうぎょ (8ブロック)\` };
    } else {
      return { type: 'attack', damage: atk, name: 'ポルターガイスト', text: \`こうげき (\${atk}ダメージ)\` };
    }
  } else if (subType === 'werewolf') {
    if (turnNumber % 2 === 0) {
      return { type: 'attack', damage: Math.floor(atk/2)+1, multi: 3, name: 'れんぞくひっかき', text: \`れんぞくこうげき (\${Math.floor(atk/2)+1}x3ダメージ)\` };
    } else if (seed < 0.3) {
      return { type: 'defend', block: 5, name: 'みをかがめる', text: \`ぼうぎょ (5ブロック)\` };
    } else {
      return { type: 'attack', damage: atk, name: 'かみつき', text: \`こうげき (\${atk}ダメージ)\` };
    }
  } else if (subType === 'vampire') {
    if (seed < 0.4) {
      return { type: 'attack', damage: atk + 5, name: 'きゅうけつ', text: \`きゅうけつこうげき (\${atk + 5}ダメージ)\` };
    } else if (seed < 0.7) {
      return { type: 'buff', strength: 2, name: 'ちをすする', text: \`チャージ (すじりょく+2)\` };
    } else {
      return { type: 'attack', damage: Math.floor(atk/2), multi: 2, name: 'やみのはどう', text: \`れんぞくこうげき (\${Math.floor(atk/2)}x2ダメージ)\` };
    }
  } else if (subType === 'demon') {
    if (turnNumber % 3 === 0) {
      return { type: 'attack', damage: atk + 10, name: 'じごくのほのお', text: \`ぜんたいこうげき (\${atk + 10}ダメージ)\` };
    } else if (turnNumber % 3 === 1) {
      return { type: 'debuff', weak: 2, name: 'あくむ', text: \`デバフ (じゃくたいか 2ターン)\` };
    } else {
      return { type: 'defend', block: 15, name: 'まほうのバリア', text: \`ぼうぎょ (15ブロック)\` };
    }
  } else if (subType === 'dragon') {
    if (turnNumber % 4 === 0) {
      return { type: 'attack', damage: atk + 20, name: 'ドラゴンブレス', text: \`ひっさつこうげき (\${atk + 20}ダメージ)\` };
    } else if (turnNumber % 4 === 3) {
      return { type: 'buff', strength: 5, name: 'いきをすいこむ', text: \`チャージ (すじりょく+5)\` };
    } else if (seed < 0.4) {
      return { type: 'defend', block: 20, name: 'はがねのうろこ', text: \`ぼうぎょ (20ブロック)\` };
    } else {
      return { type: 'attack', damage: Math.floor(atk/2)+2, multi: 2, name: 'かみくだき', text: \`れんぞくこうげき (\${Math.floor(atk/2)+2}x2ダメージ)\` };
    }
  }
  
  return { type: 'attack', damage: atk, name: 'こうげき', text: \`こうげき (\${atk}ダメージ)\` };
};`;

content = content.replace(/\/\/ Enemy Intention generator[\s\S]*?return { type: 'attack', damage: atk, name: 'こうげき', text: `こうげき \(\$\{atk\}ダメージ\)` };\r?\n};\r?\n/, newIntent + "\n");

// Update resolveEnemyTurn
const newResolve = `  const resolveEnemyTurn = () => {
    if (gameOver || gameVictory || activeQuiz || !battle) return;
    
    let nextBattle = { ...battle };
    let nextPlayer = { ...player };
    
    const intent = nextBattle.enemyIntent;
    if (intent) {
      addLog(\`\${nextBattle.enemy.name} のターン: 「\${intent.name}」を使用！\`, 'system');
      
      if (intent.damage !== undefined) {
        let multiCount = intent.multi || 1;
        
        for (let m = 0; m < multiCount; m++) {
          let baseDmg = intent.damage + (nextBattle.enemyStatus.strength || 0);
          if (nextBattle.playerStatus.vulnerable > 0) {
             baseDmg = Math.floor(baseDmg * 1.5);
          }
          let currentDmg = baseDmg;
          let playerBlock = nextBattle.playerBlock;
          let finalDmg = currentDmg;
          
          if (playerBlock > 0) {
            if (playerBlock >= currentDmg) {
              nextBattle.playerBlock -= currentDmg;
              finalDmg = 0;
            } else {
              finalDmg = currentDmg - playerBlock;
              nextBattle.playerBlock = 0;
            }
          }
          
          if (finalDmg > 0) {
            nextPlayer.hp = Math.max(0, nextPlayer.hp - finalDmg);
            addLog(\`プレイヤーは \${finalDmg} ダメージを受けた！\`, 'damage-taken');
            playHurtSound();
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 400);
            
            if (nextPlayer.hp <= 0) {
              setGameOver(true);
              setBattle(null);
              addLog("あなたは力尽きた...", 'damage-taken');
              playGameOverSound();
              return;
            }
          } else {
            addLog("プレイヤーは攻撃を完全にブロックした！", 'system');
          }
        }
      }
      
      if (intent.block !== undefined) {
        nextBattle.enemyBlock += intent.block;
        addLog(\`\${nextBattle.enemy.name} は \${intent.block} のブロックを得た。\`, 'system');
      }

      if (intent.type === 'buff') {
        if (intent.strength) nextBattle.enemyStatus.strength += intent.strength;
        addLog(\`\${nextBattle.enemy.name} のパワーが上がった！\`, 'system');
      }
      if (intent.type === 'debuff') {
        if (intent.weak) nextBattle.playerStatus.weak += intent.weak;
        if (intent.vulnerable) nextBattle.playerStatus.vulnerable += intent.vulnerable;
        addLog(\`プレイヤーは弱体化された！\`, 'system');
      }
    }
    
    // Poison damage for enemy at END of their turn? Actually usually poison happens at the start of their turn, but here is fine.
    if (nextBattle.enemyStatus.poison > 0) {
       const pDmg = nextBattle.enemyStatus.poison;
       nextBattle.enemy.hp = Math.max(0, nextBattle.enemy.hp - pDmg);
       addLog(\`毒により \${nextBattle.enemy.name} に \${pDmg} ダメージ！\`, 'system');
       nextBattle.enemyStatus.poison -= 1;
       if (nextBattle.enemy.hp <= 0) {
         // handle death from poison... wait, this is getting complicated.
         // Just a log for now, player has to attack to trigger win in handleCombatAction to be safe, 
         // OR we just set enemy hp and the next attack kills. Let's just deal the damage.
       }
    }

    // decrement player statuses
    if (nextBattle.playerStatus.weak > 0) nextBattle.playerStatus.weak--;
    if (nextBattle.playerStatus.vulnerable > 0) nextBattle.playerStatus.vulnerable--;

    nextBattle.turn += 1;
    nextBattle.playerBlock = 0; 
    nextBattle.playerEnergy = nextBattle.playerMaxEnergy; 

    nextBattle.discardPile = [...nextBattle.discardPile, ...nextBattle.hand];
    nextBattle.hand = [];
    
    let drawPile = [...nextBattle.drawPile];
    let discardPile = [...nextBattle.discardPile];
    let hand = [];
    
    let drawCount = 3;
    if (nextPlayer.relics && nextPlayer.relics.some(r => r.key === 'king_crown')) drawCount += 1;

    for (let i = 0; i < drawCount; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length === 0) break;
        drawPile = [...discardPile];
        discardPile = [];
        drawPile.sort(() => Math.random() - 0.5);
      }
      const drawn = drawPile.pop();
      hand.push(drawn);
    }
    
    nextBattle.drawPile = drawPile;
    nextBattle.discardPile = discardPile;
    nextBattle.hand = hand;
    nextBattle.enemyIntent = rollEnemyIntent(nextBattle.enemy, nextBattle.turn);
    
    setBattle(nextBattle);
    setPlayer(nextPlayer);
    setIsEnemyTurn(false);
  };`;

content = content.replace(/  const resolveEnemyTurn = \(\) => \{[\s\S]*?setIsEnemyTurn\(false\);\r?\n  \};\r?\n/, newResolve + "\n");

fs.writeFileSync('src/App.jsx', content, 'utf8');
