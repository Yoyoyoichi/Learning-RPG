const fs = require('fs');

function applyChanges() {
  let jsx = fs.readFileSync('src/App.jsx', 'utf8');

  // 1. Add isStealthMode State and listener
  const stateChunk = `  const [screenShake, setScreenShake] = useState(false);`;
  const newStateChunk = `  const [screenShake, setScreenShake] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(() => localStorage.getItem('stealthMode') === 'true');

  useEffect(() => { localStorage.setItem('stealthMode', isStealthMode); }, [isStealthMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Shift + S shortcut for stealth mode
      if (e.shiftKey && (e.key === 's' || e.key === 'S')) {
        setIsStealthMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);`;
  jsx = jsx.replace(stateChunk, newStateChunk);

  // 2. Wrap App container
  const containerChunk = `<div className={\`app-container retro-theme \${screenShake ? 'shake-effect flash-damage' : ''}\`}>`;
  const newContainerChunk = `<div className={\`app-container retro-theme \${isStealthMode ? 'stealth-theme' : ''} \${screenShake ? 'shake-effect flash-damage' : ''}\`}>`;
  jsx = jsx.replace(containerChunk, newContainerChunk);

  // 3. Add [S] button
  const resetBtnChunk = `<button 
              className="control-btn reset-layout-btn"`;
  const newResetBtnChunk = `<button type="button" className="control-btn" onClick={() => setIsStealthMode(!isStealthMode)} title="Stealth Mode (Shift+S)">[S]</button>
            <button 
              className="control-btn reset-layout-btn"`;
  jsx = jsx.replace(resetBtnChunk, newResetBtnChunk);

  // 4. Hide Emojis
  jsx = jsx.replace(/'🟢'/g, "(isStealthMode ? 'Slime' : '🟢')");
  jsx = jsx.replace(/'🦇'/g, "(isStealthMode ? 'Bat' : '🦇')");
  jsx = jsx.replace(/'💀'/g, "(isStealthMode ? 'Skeleton' : '💀')");
  jsx = jsx.replace(/'👻'/g, "(isStealthMode ? 'Ghost' : '👻')");
  jsx = jsx.replace(/'👾'/g, "(isStealthMode ? 'Enemy' : '👾')");
  jsx = jsx.replace(/'❓'/g, "(isStealthMode ? '?' : '❓')");
  jsx = jsx.replace(/'⚔️⚔️'/g, "(isStealthMode ? 'Attack(x2)' : '⚔️⚔️')");
  jsx = jsx.replace(/'⚔️'/g, "(isStealthMode ? 'Attack' : '⚔️')");
  jsx = jsx.replace(/'🛡️'/g, "(isStealthMode ? 'Defend' : '🛡️')");
  jsx = jsx.replace(/'✨'/g, "(isStealthMode ? 'Debuff' : '✨')");
  jsx = jsx.replace(/'💤'/g, "(isStealthMode ? 'Sleep' : '💤')");

  jsx = jsx.replace(/>🛡️👤</g, ">{isStealthMode ? '' : '🛡️👤'}<");
  jsx = jsx.replace(/>🛡️ \{playerBlock\}</g, ">{isStealthMode ? '' : '🛡️ '}{playerBlock}<");
  jsx = jsx.replace(/>🛡️ \{enemyBlock\}</g, ">{isStealthMode ? '' : '🛡️ '}{enemyBlock}<");
  jsx = jsx.replace(/`\+\$\{enemyIntent\.block\}🛡️`/g, "(`+${enemyIntent.block}${isStealthMode ? '' : '🛡️'}`)");
  jsx = jsx.replace(/⚡ \{playerEnergy\}/g, "{isStealthMode ? 'Energy: ' : '⚡ '}{playerEnergy}");
  jsx = jsx.replace(/>🔥</g, ">{isStealthMode ? 'FIRE' : '🔥'}<");

  jsx = jsx.replace(/<span>🛌 やすむ<\/span>/g, "<span>{isStealthMode ? '' : '🛌 '}やすむ</span>");
  jsx = jsx.replace(/<span>🔨 きたえる<\/span>/g, "<span>{isStealthMode ? '' : '🔨 '}きたえる</span>");

  jsx = jsx.replace(/>🎮 パッド非表示/g, ">{isStealthMode ? '' : '🎮 '}パッド非表示");
  jsx = jsx.replace(/>🎮 パッド表示/g, ">{isStealthMode ? '' : '🎮 '}パッド表示");

  jsx = jsx.replace(/'🗡️'/g, "(isStealthMode ? 'Swd' : '🗡️')");
  jsx = jsx.replace(/'➖'/g, "(isStealthMode ? '-' : '➖')");

  jsx = jsx.replace(/🗺️ MAP & BATTLE/g, "{isStealthMode ? '' : '🗺️ '}MAP & BATTLE");
  jsx = jsx.replace(/📊 STATUS/g, "{isStealthMode ? '' : '📊 '}STATUS");
  jsx = jsx.replace(/📜 LOGS/g, "{isStealthMode ? '' : '📜 '}LOGS");
  jsx = jsx.replace(/🔑 LEGEND/g, "{isStealthMode ? '' : '🔑 '}LEGEND");
  jsx = jsx.replace(/📖 DECK & WORDS/g, "{isStealthMode ? '' : '📖 '}DECK & WORDS");
  jsx = jsx.replace(/⚙️ SETTINGS/g, "{isStealthMode ? '' : '⚙️ '}SETTINGS");
  jsx = jsx.replace(/🔄 RESET/g, "{isStealthMode ? '' : '🔄 '}RESET");
  jsx = jsx.replace(/📊 プレイ画面/g, "{isStealthMode ? '' : '📊 '}プレイ画面");
  jsx = jsx.replace(/📖 デッキ & 単語/g, "{isStealthMode ? '' : '📖 '}デッキ & 単語");

  jsx = jsx.replace(/💾 セーブ＆ロード/g, "{isStealthMode ? '' : '💾 '}セーブ＆ロード");
  jsx = jsx.replace(/📥 セーブ書き出し/g, "{isStealthMode ? '' : '📥 '}セーブ書き出し");
  jsx = jsx.replace(/📤 セーブ読み込み/g, "{isStealthMode ? '' : '📤 '}セーブ読み込み");
  jsx = jsx.replace(/📝 カスタム問題の追加 \(CSV\)/g, "{isStealthMode ? '' : '📝 '}カスタム問題の追加 (CSV)");
  jsx = jsx.replace(/📄 CSVファイルを読み込む/g, "{isStealthMode ? '' : '📄 '}CSVファイルを読み込む");
  jsx = jsx.replace(/📊 成績・学習記録/g, "{isStealthMode ? '' : '📊 '}成績・学習記録");
  jsx = jsx.replace(/📊 成績をCSVで書き出し/g, "{isStealthMode ? '' : '📊 '}成績をCSVで書き出し");

  jsx = jsx.replace(/`🛌 やすむ/g, "`\\${isStealthMode ? '' : '🛌 '}やすむ");
  jsx = jsx.replace(/`🔨 きたえる/g, "`\\${isStealthMode ? '' : '🔨 '}きたえる");
  jsx = jsx.replace(/`🎁 デッキに/g, "`\\${isStealthMode ? '' : '🎁 '}デッキに");
  jsx = jsx.replace(/"🎁 カード報酬をスキップした。"/g, "(isStealthMode ? 'カード報酬をスキップした。' : '🎁 カード報酬をスキップした。')");
  jsx = jsx.replace(/>✨ \+\{xp\} XP</g, ">{isStealthMode ? '' : '✨ '}+{xp} XP<");
  jsx = jsx.replace(/🛡️完全にブロックした！/g, "\\${isStealthMode ? '' : '🛡️'}完全にブロックした！");

  // 5. Replace Keyboard logic via careful string replacement
  const lastMoveMatch = jsx.lastIndexOf('lastMoveTimeRef.current = now;');
  if (lastMoveMatch !== -1) {
     const blockStart = jsx.lastIndexOf('    const handleKeyDown = (e) => {', lastMoveMatch);
     const blockEnd = jsx.indexOf('    };', lastMoveMatch) + 6;
     if (blockStart !== -1 && blockEnd !== -1) {
        const newHandleKeydown = `    const handleKeyDown = (e) => {
      if (gameOver) {
        if (e.key === 'Enter') startNewGame();
        return;
      }
      if (gameVictory) {
        if (e.key === 'Enter') startNewGame();
        return;
      }
      if (isStoryLoading || floorStory) {
        if (!isStoryLoading && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setFloorStory(null);
        }
        return;
      }
      if (activeQuiz) return;
      
      if (battle) {
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
          e.preventDefault();
          handleEndTurn();
        } else if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key) - 1;
          if (idx < battle.hand.length) {
            e.preventDefault();
            playCard(battle.hand[idx], idx);
          }
        }
        return;
      }
      if (campsite) {
        if (!campsite.upgradeMode) {
          if (e.key === '1') { e.preventDefault(); handleCampsiteAction('rest'); }
          if (e.key === '2') { e.preventDefault(); handleCampsiteAction('upgrade'); }
        } else {
          if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1;
            if (idx < player.deck.length) {
              e.preventDefault();
              handleUpgradeCard(idx);
            }
          }
        }
        return;
      }
      if (cardReward) {
        if (e.key >= '1' && e.key <= '3') {
          const idx = parseInt(e.key) - 1;
          if (idx < cardReward.length) {
            e.preventDefault();
            handleCardRewardSelect(cardReward[idx]);
          }
        } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          handleSkipReward();
        }
        return;
      }

      const now = Date.now();
      if (now - lastMoveTimeRef.current < 120) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '].includes(e.key)) {
          e.preventDefault();
        }
        return;
      }

      let moved = false;
      switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); handleMove(0, -1); moved = true; break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); handleMove(0, 1); moved = true; break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); handleMove(-1, 0); moved = true; break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); handleMove(1, 0); moved = true; break;
        case ' ': e.preventDefault(); handleWait(); moved = true; break;
        default: break;
      }

      if (moved) {
        lastMoveTimeRef.current = now;
      }
    };`;
        jsx = jsx.substring(0, blockStart) + newHandleKeydown + jsx.substring(blockEnd);
     } else {
        console.error("Bounds not found!");
     }
  } else {
     console.error("lastMoveMatch not found!");
  }

  // Update dependencies
  const oldDeps = /  \}, \[player, grid, rooms, enemies, items, gameOver, gameVictory, activeQuiz, battle, campsite, cardReward\]\);/g;
  const newDeps = `  }, [player, grid, rooms, enemies, items, gameOver, gameVictory, activeQuiz, battle, campsite, cardReward, isStoryLoading, floorStory]);`;
  jsx = jsx.replace(oldDeps, newDeps);

  fs.writeFileSync('src/App.jsx', jsx, 'utf8');
  console.log('App.jsx successfully patched with everything!');
  
  // Also append Stealth Mode to App.css if not already present
  let css = fs.readFileSync('src/App.css', 'utf8');
  if (!css.includes('.stealth-theme')) {
    css += '\n\n/* Stealth Mode Uniform Fonts */\n.stealth-theme, .stealth-theme * {\n  font-size: 14px !important;\n  line-height: 1.5 !important;\n  font-family: monospace, sans-serif !important;\n}\n.stealth-theme h1, .stealth-theme h2, .stealth-theme h3, .stealth-theme .overlay-title {\n  font-size: 16px !important;\n  font-weight: bold !important;\n  margin-bottom: 8px !important;\n  animation: none !important;\n  transform: none !important;\n}\n.stealth-theme button {\n  font-size: 14px !important;\n}\n'; 
    fs.writeFileSync('src/App.css', css);
    console.log('App.css successfully patched with Stealth Mode!');
  }
}

applyChanges();
