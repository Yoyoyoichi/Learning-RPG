const fs = require('fs');
let jsx = fs.readFileSync('src/App.jsx', 'utf8');
const start = jsx.lastIndexOf('    const handleKeyDown = (e) => {');
const end = jsx.indexOf('    window.addEventListener(\'keydown\', handleKeyDown);', start);
const newCode = `    const handleKeyDown = (e) => {
      if (gameOver) {
        if (e.key === 'Enter') startNewGame();
        return;
      }
      if (gameVictory) {
        if (e.key === 'Enter') startNewGame();
        return;
      }
      if (floorStory) {
        if (e.key === 'Enter' || e.key === ' ') {
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
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove(0, -1);
          moved = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove(0, 1);
          moved = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove(-1, 0);
          moved = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove(1, 0);
          moved = true;
          break;
        case ' ':
          e.preventDefault();
          handleWait();
          moved = true;
          break;
        default:
          break;
      }

      if (moved) {
        lastMoveTimeRef.current = now;
      }
    };

`;
jsx = jsx.substring(0, start) + newCode + jsx.substring(end);
fs.writeFileSync('src/App.jsx', jsx);
