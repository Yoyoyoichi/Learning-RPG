const fs = require('fs');
let jsx = fs.readFileSync('src/App.jsx', 'utf8');

const oldCode = `  const handleMove = (dx, dy) => {

    // Check for Enemy
    const enemyIndex = nextEnemies.findIndex(e => e.x === tx && e.y === ty);`;

const newCode = `  const handleMove = (dx, dy) => {
    try {
      if (gameOver || gameVictory || activeQuiz || battle || campsite || cardReward || shop) return;

      const tx = player.x + dx;
      const ty = player.y + dy;

      const currentRows = grid.length;
      const currentCols = grid.length > 0 ? grid[0].length : 0;
      if (tx < 0 || tx >= currentCols || ty < 0 || ty >= currentRows) return;

      const targetTile = grid[ty][tx];
      if (targetTile.type === 'wall') return;

      let nextPlayer = { ...player };
      let nextEnemies = [...enemies];
      let nextItems = [...items];
      let turnConsumed = false;

    // Check for Enemy
    const enemyIndex = nextEnemies.findIndex(e => e.x === tx && e.y === ty && e.hp > 0);`;

jsx = jsx.replace(oldCode, newCode);
fs.writeFileSync('src/App.jsx', jsx);
