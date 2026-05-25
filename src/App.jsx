import React, { useState, useEffect, useRef } from 'react';
import TileMap from './components/TileMap';
import QuizOverlay from './components/QuizOverlay';
import WordListPanel from './components/WordListPanel';
import { getRandomWord } from './utils/words';
import {
  playMoveSound,
  playHitSound,
  playHurtSound,
  playLevelUpSound,
  playGameOverSound,
  playVictorySound
} from './utils/sound';
import './App.css';

// Grid Dimensions
const COLS = 20;
const ROWS = 20;

// Procedural Dungeon Generator
const generateDungeon = (floor) => {
  const grid = [];
  
  // 1. Initialize map with walls
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ char: '#', type: 'wall' });
    }
    grid.push(row);
  }

  const rooms = [];
  const minSize = 4;
  const maxSize = 6;
  const maxRooms = 6;

  // 2. Generate random rooms
  for (let i = 0; i < maxRooms; i++) {
    const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
    const y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;

    // Check overlap with padding of 1
    let overlap = false;
    for (const r of rooms) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      rooms.push({ 
        x, y, w, h, 
        cx: Math.floor(x + w / 2), 
        cy: Math.floor(y + h / 2) 
      });
      
      // Carve room
      for (let r = y; r < y + h; r++) {
        for (let c = x; c < x + w; c++) {
          grid[r][c] = { char: '.', type: 'floor' };
        }
      }
    }
  }

  // 3. Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const r1 = rooms[i - 1];
    const r2 = rooms[i];

    // Horizontal corridor from room 1 center to room 2 center
    const startX = Math.min(r1.cx, r2.cx);
    const endX = Math.max(r1.cx, r2.cx);
    for (let cx = startX; cx <= endX; cx++) {
      grid[r1.cy][cx] = { char: '.', type: 'floor' };
    }

    // Vertical corridor
    const startY = Math.min(r1.cy, r2.cy);
    const endY = Math.max(r1.cy, r2.cy);
    for (let cy = startY; cy <= endY; cy++) {
      grid[cy][r2.cx] = { char: '.', type: 'floor' };
    }
  }

  // Fallback if no rooms were successfully carved
  if (rooms.length === 0) {
    rooms.push({ x: 2, y: 2, w: 16, h: 16, cx: 10, cy: 10 });
    for (let r = 2; r < 18; r++) {
      for (let c = 2; c < 18; c++) {
        grid[r][c] = { char: '.', type: 'floor' };
      }
    }
  }

  // 4. Place Player start position (First Room Center)
  const startPos = { x: rooms[0].cx, y: rooms[0].cy };

  // 5. Place Stairs Down (Last Room Center)
  const lastRoom = rooms[rooms.length - 1];
  grid[lastRoom.cy][lastRoom.cx] = { char: '>', type: 'stairs' };

  // 6. Spawn Enemies
  const enemies = [];
  const enemyTypes = [
    { subType: 'slime', char: 's', name: 'スライム', hp: 8, atk: 3, def: 0, xp: 5, gold: 3 },
    { subType: 'bat', char: 'b', name: 'コウモリ', hp: 6, atk: 4, def: 1, xp: 8, gold: 4 },
    { subType: 'skeleton', char: 'S', name: 'スケルトン', hp: 15, atk: 6, def: 2, xp: 15, gold: 8 },
    { subType: 'ghost', char: 'G', name: 'ゴースト', hp: 12, atk: 5, def: 3, xp: 20, gold: 10 }
  ];

  // Limit enemy pool depending on floor difficulty
  let activePool = enemyTypes.slice(0, 2); // Slime and Bat
  if (floor >= 2) activePool = enemyTypes.slice(0, 3); // + Skeleton
  if (floor >= 3) activePool = enemyTypes; // + Ghost

  // Spawn Items
  const items = [];
  const itemTypes = [
    { subType: 'potion', char: 'P', name: 'ポーション' },
    { subType: 'chest', char: 'C', name: '宝箱' }
  ];

  const equipmentTypes = [
    { subType: 'sword', char: 'W', name: '鉄の剣' },
    { subType: 'shield', char: 'D', name: '鉄の盾' }
  ];

  let entityIdCounter = 0;

  // Fill rooms with entities
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];

    // Spawn Enemy in the room
    const enemyX = Math.floor(room.x + Math.random() * room.w);
    const enemyY = Math.floor(room.y + Math.random() * room.h);
    
    if (!(enemyX === lastRoom.cx && enemyY === lastRoom.cy)) {
      const et = activePool[Math.floor(Math.random() * activePool.length)];
      // Scale enemy stats based on floor level
      const statScale = 1 + (floor - 1) * 0.25;
      
      enemies.push({
        id: entityIdCounter++,
        x: enemyX,
        y: enemyY,
        char: et.char,
        type: 'enemy',
        subType: et.subType,
        name: et.name,
        hp: Math.round(et.hp * statScale),
        maxHp: Math.round(et.hp * statScale),
        atk: Math.round(et.atk * statScale),
        def: Math.round(et.def * statScale),
        xp: Math.round(et.xp * statScale),
        gold: Math.round(et.gold * statScale)
      });
    }

    // Spawn Item in the room
    const itemX = Math.floor(room.x + Math.random() * room.w);
    const itemY = Math.floor(room.y + Math.random() * room.h);
    
    if (!(itemX === lastRoom.cx && itemY === lastRoom.cy) && !(itemX === startPos.x && itemY === startPos.y)) {
      // 70% consumable / chest, 30% equipment
      let selectedItem;
      if (Math.random() < 0.3) {
        selectedItem = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
      } else {
        selectedItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      }

      // Check overlaps
      const isOccupiedByEnemy = enemies.some(e => e.x === itemX && e.y === itemY);
      if (!isOccupiedByEnemy) {
        items.push({
          x: itemX,
          y: itemY,
          char: selectedItem.char,
          type: 'item',
          subType: selectedItem.subType,
          name: selectedItem.name
        });
      }
    }
  }

  return { grid, enemies, items, startPos };
};

// Initial Player Stats
const INITIAL_PLAYER = {
  x: 0,
  y: 0,
  hp: 40,
  maxHp: 40,
  atk: 7,
  def: 2,
  level: 1,
  xp: 0,
  xpNeeded: 20,
  gold: 0,
  floor: 1,
  swordEquipped: false,
  shieldEquipped: false
};

function App() {
  const [player, setPlayer] = useState(INITIAL_PLAYER);
  const [grid, setGrid] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameVictory, setGameVictory] = useState(false);

  // Quiz and Word Learning States
  const [customWords, setCustomWords] = useState([]);
  const [learnedWords, setLearnedWords] = useState({});
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [rightTab, setRightTab] = useState('status'); // 'status' or 'wordlist'

  const logEndRef = useRef(null);

  // Helper to add logs
  const addLog = (text, type = 'system') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { text, type, time }]);
  };

  // Scroll to bottom of logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Load first floor on mount
  useEffect(() => {
    startNewGame();
  }, []);

  // Initialize/Restart Game
  const startNewGame = () => {
    const dungeon = generateDungeon(1);
    setGrid(dungeon.grid);
    setEnemies(dungeon.enemies);
    setItems(dungeon.items);
    setPlayer({
      ...INITIAL_PLAYER,
      x: dungeon.startPos.x,
      y: dungeon.startPos.y
    });
    setGameOver(false);
    setGameVictory(false);
    setLogs([]);
    setActiveQuiz(null);
    
    // Add welcome logs
    const welcomeMsgs = [
      "テキストローグライク RPG へようこそ！",
      "操作方法: キーボードの矢印キー、WASD、または画面下のボタンで移動",
      "敵がいるマスに進むと攻撃、アイテムの上に進むと回収します。",
      "Floor 5 の階段を降りればクリアです！ 生還を目指しましょう。"
    ];
    welcomeMsgs.forEach(msg => addLog(msg, 'system'));
  };

  // Set up next floor
  const loadNextFloor = (nextFloorNum) => {
    const dungeon = generateDungeon(nextFloorNum);
    setGrid(dungeon.grid);
    setEnemies(dungeon.enemies);
    setItems(dungeon.items);
    
    // Maintain stats, restore partial HP on floor transition
    setPlayer(prev => {
      const healedHp = Math.min(prev.maxHp, prev.hp + Math.round(prev.maxHp * 0.25));
      return {
        ...prev,
        x: dungeon.startPos.x,
        y: dungeon.startPos.y,
        hp: healedHp,
        floor: nextFloorNum
      };
    });

    addLog(`地下 ${nextFloorNum} 階へ進んだ。敵はさらに手強くなっている！`, 'system');
  };

  // Resolve spelling quiz turn outcomes
  const resolveCombatTurn = (isCorrectAnswer) => {
    if (!activeQuiz) return;
    const { target, wordObj } = activeQuiz;
    const { tx, ty, enemyIndex } = target;

    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];
    let newLogs = [];

    const addTurnLog = (text, type = 'system') => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      newLogs.push({ text, type, time });
    };

    // Update vocabulary notebook states
    setLearnedWords(prev => {
      const current = prev[wordObj.word] || { meaning: wordObj.meaning, correctCount: 0, incorrectCount: 0, isReview: false };
      return {
        ...prev,
        [wordObj.word]: {
          ...current,
          correctCount: current.correctCount + (isCorrectAnswer ? 1 : 0),
          incorrectCount: current.incorrectCount + (isCorrectAnswer ? 0 : 1),
          isReview: !isCorrectAnswer
        }
      };
    });

    const enemy = nextEnemies[enemyIndex];
    let enemyStunned = false;

    if (isCorrectAnswer) {
      // 1. Correct Answer: Deal damage and stun the targeted enemy
      const currentAtk = nextPlayer.atk + (nextPlayer.swordEquipped ? 4 : 0);
      const playerDmg = Math.max(1, currentAtk - enemy.def);
      
      enemy.hp -= playerDmg;
      addTurnLog(`【正解】スペル入力成功！ ${enemy.name} に ${playerDmg} のダメージ！`, 'damage-dealt');
      playHitSound();

      if (enemy.hp <= 0) {
        addTurnLog(`${enemy.name} を倒した！`, 'system');
        addTurnLog(`${enemy.xp} XP と ${enemy.gold} ゴールドを獲得した。`, 'item-pickup');
        
        nextEnemies.splice(enemyIndex, 1);
        nextPlayer.xp += enemy.xp;
        nextPlayer.gold += enemy.gold;

        if (nextPlayer.xp >= nextPlayer.xpNeeded) {
          nextPlayer.level += 1;
          nextPlayer.xp -= nextPlayer.xpNeeded;
          nextPlayer.xpNeeded = Math.round(nextPlayer.xpNeeded * 1.5);
          nextPlayer.maxHp += 8;
          nextPlayer.hp = nextPlayer.maxHp;
          nextPlayer.atk += 2;
          nextPlayer.def += 1;
          
          addTurnLog(`レベルアップ！ レベル ${nextPlayer.level} になった！ (HP最大値+8、攻撃力+2、守備力+1)`, 'level-up');
          playLevelUpSound();
        }
      } else {
        // Targeted enemy is stunned (cannot counter-attack this turn)
        enemyStunned = true;
        addTurnLog(`${enemy.name} は攻撃の衝撃でひるんでいる！`, 'system');
      }
    } else {
      // 2. Incorrect Answer: Miss and get counter-attacked
      addTurnLog(`【不正解】英単語のスペル入力に失敗！ 攻撃が不発に終わった。`, 'damage-taken');
    }

    // Process Enemy Reactions
    let playerHpDamage = 0;

    nextEnemies = nextEnemies.map(e => {
      const dx = nextPlayer.x - e.x;
      const dy = nextPlayer.y - e.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist === 1) {
        // If correct answer and this is the targeted enemy, it is stunned
        if (isCorrectAnswer && e.x === tx && e.y === ty && enemyStunned) {
          return e;
        }
        
        const currentDef = nextPlayer.def + (nextPlayer.shieldEquipped ? 2 : 0);
        const enemyDmg = Math.max(1, e.atk - currentDef);
        playerHpDamage += enemyDmg;
        addTurnLog(`${e.name} から ${enemyDmg} のダメージを受けた！`, 'damage-taken');
        return e;
      } else if (dist <= 5) {
        // Enemy chases player
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);

        let nextX = e.x + stepX;
        let nextY = e.y;

        let isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
        let isOccupied = nextEnemies.some(other => other.x === nextX && other.y === nextY) || (nextX === nextPlayer.x && nextY === nextPlayer.y);

        if (isBlocked || isOccupied) {
          nextX = e.x;
          nextY = e.y + stepY;
          isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
          isOccupied = nextEnemies.some(other => other.x === nextX && other.y === nextY) || (nextX === nextPlayer.x && nextY === nextPlayer.y);
        }

        if (!isBlocked && !isOccupied) {
          return { ...e, x: nextX, y: nextY };
        }
      }
      return e;
    });

    if (playerHpDamage > 0) {
      nextPlayer.hp = Math.max(0, nextPlayer.hp - playerHpDamage);
      if (nextPlayer.hp <= 0) {
        setGameOver(true);
        addTurnLog("あなたは力尽きた...", 'damage-taken');
        addTurnLog("GAME OVER. リスタートボタンで再挑戦できます。", 'system');
        playGameOverSound();
      } else {
        if (!isCorrectAnswer) {
          playHurtSound();
        }
      }
    }

    setPlayer(nextPlayer);
    setEnemies(nextEnemies);
    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs]);
    }
    setActiveQuiz(null);
  };

  // Turn logic execution (Synchronous State Resolution)
  const handleMove = (dx, dy) => {
    if (gameOver || gameVictory || activeQuiz) return;

    const tx = player.x + dx;
    const ty = player.y + dy;

    // Check bounds
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;

    const targetTile = grid[ty][tx];
    
    // Wall collision
    if (targetTile.type === 'wall') return;

    // Clone current states to modify synchronously
    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];
    let nextItems = [...items];
    let newLogs = [];

    const addTurnLog = (text, type = 'system') => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      newLogs.push({ text, type, time });
    };

    let turnConsumed = false;

    // Check for Enemy
    const enemyIndex = nextEnemies.findIndex(e => e.x === tx && e.y === ty);
    
    if (enemyIndex !== -1) {
      // Intercept battle and start spelling quiz
      const reviewList = Object.keys(learnedWords)
        .filter(w => learnedWords[w].isReview)
        .map(w => ({ word: w, meaning: learnedWords[w].meaning }));
        
      const wordObj = getRandomWord(player.floor, customWords, reviewList);
      
      setActiveQuiz({
        wordObj,
        type: 'enemy',
        target: { tx, ty, enemyIndex }
      });
      return;
    } else {
      // Check for Items
      const itemIndex = nextItems.findIndex(i => i.x === tx && i.y === ty);

      if (itemIndex !== -1) {
        const item = nextItems[itemIndex];
        
        if (item.subType === 'potion') {
          // Recover HP
          const recoverAmount = 15;
          nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + recoverAmount);
          addTurnLog(`${item.name} を飲んだ。HP が ${recoverAmount} 回復した。`, 'item-pickup');
        } else if (item.subType === 'chest') {
          // Gain Gold
          const goldAmount = Math.floor(Math.random() * 16) + 10; // 10-25
          nextPlayer.gold += goldAmount;
          addTurnLog(`${item.name} を開けた！ ${goldAmount} ゴールドを手に入れた。`, 'item-pickup');
        } else if (item.subType === 'sword') {
          // Equip Sword
          nextPlayer.swordEquipped = true;
          addTurnLog(`${item.name} を手に入れ、装備した！ (攻撃力 +4)`, 'item-pickup');
        } else if (item.subType === 'shield') {
          // Equip Shield
          nextPlayer.shieldEquipped = true;
          addTurnLog(`${item.name} を手に入れ、装備した！ (防御力 +2)`, 'item-pickup');
        }

        // Remove item from floor
        nextItems.splice(itemIndex, 1);
      }

      // Move player
      nextPlayer.x = tx;
      nextPlayer.y = ty;
      playMoveSound();

      // Check if player stepped on stairs
      if (targetTile.type === 'stairs') {
        if (nextPlayer.floor === 5) {
          // Victory!
          setGameVictory(true);
          addLog("階段を降り、ダンジョンからの脱出に成功した！", 'system');
          addLog("おめでとうございます！あなたの完全勝利です！", 'level-up');
          playVictorySound();
          return;
        } else {
          loadNextFloor(nextPlayer.floor + 1);
          return;
        }
      }

      turnConsumed = true;
    }

    // Process Enemy Reactions
    if (turnConsumed) {
      let playerHpDamage = 0;

      nextEnemies = nextEnemies.map(enemy => {
        const dx = nextPlayer.x - enemy.x;
        const dy = nextPlayer.y - enemy.y;
        const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance

        if (dist === 1) {
          // Enemy attacks player
          const currentDef = nextPlayer.def + (nextPlayer.shieldEquipped ? 2 : 0);
          const enemyDmg = Math.max(1, enemy.atk - currentDef);
          playerHpDamage += enemyDmg;
          
          addTurnLog(`${enemy.name} から ${enemyDmg} のダメージを受けた！`, 'damage-taken');
          return enemy; // No movement
        } else if (dist <= 5) {
          // Enemy chases player
          const stepX = Math.sign(dx);
          const stepY = Math.sign(dy);

          // Try X direction first
          let nextX = enemy.x + stepX;
          let nextY = enemy.y;

          let isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
          let isOccupied = nextEnemies.some(e => e.x === nextX && e.y === nextY) || (nextX === nextPlayer.x && nextY === nextPlayer.y);

          if (isBlocked || isOccupied) {
            // Try Y direction
            nextX = enemy.x;
            nextY = enemy.y + stepY;
            
            isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
            isOccupied = nextEnemies.some(e => e.x === nextX && e.y === nextY) || (nextX === nextPlayer.x && nextY === nextPlayer.y);
          }

          if (!isBlocked && !isOccupied) {
            return { ...enemy, x: nextX, y: nextY };
          }
        }
        
        return enemy; // Stay idle
      });

      if (playerHpDamage > 0) {
        nextPlayer.hp = Math.max(0, nextPlayer.hp - playerHpDamage);
        if (nextPlayer.hp <= 0) {
          setGameOver(true);
          addTurnLog("あなたは力尽きた...", 'damage-taken');
          addTurnLog("GAME OVER. リスタートボタンで再挑戦できます。", 'system');
          playGameOverSound();
        } else {
          playHurtSound();
        }
      }
    }

    // Commit state updates
    setPlayer(nextPlayer);
    setEnemies(nextEnemies);
    setItems(nextItems);
    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs]);
    }
  };

  // Wait Turn (Player skips movement, enemies react)
  const handleWait = () => {
    if (gameOver || gameVictory || activeQuiz) return;

    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];
    let newLogs = [];

    const addTurnLog = (text, type = 'system') => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      newLogs.push({ text, type, time });
    };

    addTurnLog("あなたは立ち止まって警戒した。", 'system');
    playMoveSound();

    let playerHpDamage = 0;

    nextEnemies = nextEnemies.map(enemy => {
      const dx = nextPlayer.x - enemy.x;
      const dy = nextPlayer.y - enemy.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist === 1) {
        // Enemy attacks player
        const currentDef = nextPlayer.def + (nextPlayer.shieldEquipped ? 2 : 0);
        const enemyDmg = Math.max(1, enemy.atk - currentDef);
        playerHpDamage += enemyDmg;
        
        addTurnLog(`${enemy.name} から ${enemyDmg} のダメージを受けた！`, 'damage-taken');
        return enemy;
      } else if (dist <= 5) {
        // Enemy moves closer
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);

        let nextX = enemy.x + stepX;
        let nextY = enemy.y;

        let isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
        let isOccupied = nextEnemies.some(e => e.x === nextX && e.y === nextY) || (nextX === nextPlayer.x && nextY === nextPlayer.y);

        if (isBlocked || isOccupied) {
          nextX = enemy.x;
          nextY = enemy.y + stepY;
          isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
          isOccupied = nextEnemies.some(e => e.x === nextX && e.y === nextY) || (nextX === nextPlayer.x && nextY === nextPlayer.y);
        }

        if (!isBlocked && !isOccupied) {
          return { ...enemy, x: nextX, y: nextY };
        }
      }
      return enemy;
    });

    if (playerHpDamage > 0) {
      nextPlayer.hp = Math.max(0, nextPlayer.hp - playerHpDamage);
      if (nextPlayer.hp <= 0) {
        setGameOver(true);
        addTurnLog("あなたは力尽きた...", 'damage-taken');
        addTurnLog("GAME OVER. リスタートボタンで再挑戦できます。", 'system');
        playGameOverSound();
      } else {
        playHurtSound();
      }
    }

    setPlayer(nextPlayer);
    setEnemies(nextEnemies);
    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs]);
    }
  };

  // Keyboard Movement Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver || gameVictory || activeQuiz) return;

      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove(1, 0);
          break;
        case ' ': // Space key to wait a turn
          e.preventDefault();
          handleWait();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, grid, enemies, items, gameOver, gameVictory, activeQuiz]);

  // Construct render grid (merge base map, player, enemies, and items)
  const renderGrid = grid.map((row, rIdx) => 
    row.map((tile, cIdx) => {
      // 1. Check Player
      if (player.x === cIdx && player.y === rIdx && !gameOver) {
        return { char: '@', type: 'player' };
      }
      
      // 2. Check Enemies
      const enemy = enemies.find(e => e.x === cIdx && e.y === rIdx);
      if (enemy) {
        return { char: enemy.char, type: 'enemy', subType: enemy.subType };
      }

      // 3. Check Items
      const item = items.find(i => i.x === cIdx && i.y === rIdx);
      if (item) {
        return { char: item.char, type: 'item', subType: item.subType };
      }

      // 4. Return Base Map Tile (wall / floor / stairs)
      return tile;
    })
  );

  return (
    <div className="app-container retro-theme">
      <header className="app-header">
        <h1>ROGUE-TEXT RPG</h1>
        <p>Retro ASCII Roguelike Dungeon Explorer</p>
      </header>

      <main className="app-main">
        {/* Left column: Grid map and mobile D-pad */}
        <div className="game-left-col">
          <TileMap grid={renderGrid} />

          {activeQuiz ? (
            <QuizOverlay 
              wordObj={activeQuiz.wordObj}
              onCorrect={() => resolveCombatTurn(true)}
              onIncorrect={() => resolveCombatTurn(false)}
            />
          ) : (
            /* D-pad Controller */
            <div className="dpad-container">
              <button className="dpad-btn empty"></button>
              <button className="dpad-btn" onClick={() => handleMove(0, -1)}>▲</button>
              <button className="dpad-btn empty"></button>
              
              <button className="dpad-btn" onClick={() => handleMove(-1, 0)}>◀</button>
              <button className="dpad-btn wait" onClick={handleWait}>WAIT</button>
              <button className="dpad-btn" onClick={() => handleMove(1, 0)}>▶</button>
              
              <button className="dpad-btn empty"></button>
              <button className="dpad-btn" onClick={() => handleMove(0, 1)}>▼</button>
              <button className="dpad-btn empty"></button>
            </div>
          )}
        </div>

        {/* Right column: Stats, Inventory, Logs and Word List */}
        <div className="game-right-col">
          {/* Panel tab switches */}
          <div className="panel-tabs">
            <button 
              className={`panel-tab-btn ${rightTab === 'status' ? 'active' : ''}`}
              onClick={() => setRightTab('status')}
            >
              📊 ステータス & ログ
            </button>
            <button 
              className={`panel-tab-btn ${rightTab === 'wordlist' ? 'active' : ''}`}
              onClick={() => setRightTab('wordlist')}
            >
              📖 単語帳・設定 ({Object.keys(learnedWords).length})
            </button>
          </div>

          {rightTab === 'status' ? (
            <>
              {/* Status Panel */}
              <div className="panel">
                <div className="panel-title">
                  <span>PLAYER STATUS</span>
                  <span className="stat-value floor">B{player.floor}F</span>
                </div>
                
                {/* HP Bar */}
                <div className="bar-container">
                  <div className="bar-header">
                    <span>HP: {player.hp} / {player.maxHp}</span>
                  </div>
                  <div className="bar-bg">
                    <div 
                      className="bar-fill hp" 
                      style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* XP Bar */}
                <div className="bar-container">
                  <div className="bar-header">
                    <span>XP: {player.xp} / {player.xpNeeded}</span>
                  </div>
                  <div className="bar-bg">
                    <div 
                      className="bar-fill xp" 
                      style={{ width: `${Math.min(100, (player.xp / player.xpNeeded) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* General Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">LEVEL</span>
                    <span className="stat-value level">{player.level}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">GOLD</span>
                    <span className="stat-value gold">{player.gold} G</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">ATK (ATTACK)</span>
                    <span className="stat-value">
                      {player.atk} {player.swordEquipped && <span style={{ color: '#00d2ff' }}>+4</span>}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">DEF (DEFENSE)</span>
                    <span className="stat-value">
                      {player.def} {player.shieldEquipped && <span style={{ color: '#3385ff' }}>+2</span>}
                    </span>
                  </div>
                </div>

                {/* Inventory Slots */}
                <div className="panel-title" style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                  EQUIPPED ITEMS
                </div>
                <div className="inventory-list">
                  <div className={`inventory-slot ${player.swordEquipped ? 'equipped' : ''}`}>
                    <span className="equip-icon">{player.swordEquipped ? '🗡️' : '➖'}</span>
                    <span>{player.swordEquipped ? '鉄の剣 (+4)' : '武器スロット'}</span>
                  </div>
                  <div className={`inventory-slot ${player.shieldEquipped ? 'equipped' : ''}`}>
                    <span className="equip-icon">{player.shieldEquipped ? '🛡️' : '➖'}</span>
                    <span>{player.shieldEquipped ? '鉄の盾 (+2)' : '防具スロット'}</span>
                  </div>
                </div>
              </div>

              {/* Activity Logs Panel */}
              <div className="panel">
                <div className="panel-title">ACTION LOGS</div>
                <div className="log-container">
                  {logs.map((log, index) => (
                    <div key={index} className={`log-entry ${log.type}`}>
                      <small style={{ color: '#52525b', marginRight: '6px' }}>[{log.time}]</small>
                      {log.text}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Symbol Legend box */}
              <div className="panel">
                <div className="panel-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>LEGEND & KEY</div>
                <div className="legend-box">
                  <div className="legend-item"><span className="legend-symbol tile-player">@</span><span>Player</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-wall">#</span><span>Wall</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-floor">.</span><span>Floor</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-enemy">s/S</span><span>Monster</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-item tile-sub-potion">P</span><span>Potion</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-item tile-sub-chest">C</span><span>Chest</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-item tile-sub-sword">W</span><span>Sword</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-item tile-sub-shield">D</span><span>Shield</span></div>
                  <div className="legend-item"><span className="legend-symbol tile-stairs">&gt;</span><span>Stairs</span></div>
                </div>
              </div>
            </>
          ) : (
            <WordListPanel 
              learnedWords={learnedWords}
              customWordsCount={customWords.length}
              onImportCustomWords={(words) => {
                setCustomWords(words);
                addLog(`カスタム単語リスト (${words.length}語) を読み込みました！`, 'system');
              }}
              onClearCustomWords={() => {
                setCustomWords([]);
                addLog("デフォルトの単語リストに戻しました。", 'system');
              }}
            />
          )}

          {/* Restart Control Button */}
          <button className="action-btn reset-panel" onClick={startNewGame}>
            GIVE UP & RESTART
          </button>
        </div>
      </main>

      {/* Game Over Screen */}
      {gameOver && (
        <div className="overlay-screen">
          <div className="overlay-title gameover">GAME OVER</div>
          <div className="overlay-stats">
            <span>到達階層: <strong>Floor {player.floor}</strong></span>
            <span>最終レベル: <strong>Level {player.level}</strong></span>
            <span>獲得ゴールド: <strong>{player.gold} G</strong></span>
          </div>
          <button className="action-btn" onClick={startNewGame}>
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Victory Screen */}
      {gameVictory && (
        <div className="overlay-screen">
          <div className="overlay-title victory">VICTORY CLEAR!</div>
          <div className="overlay-stats">
            <span>ダンジョンから無事に生還しました！</span>
            <span>最終レベル: <strong>Level {player.level}</strong></span>
            <span>最終ゴールド: <strong>{player.gold} G</strong></span>
          </div>
          <button className="action-btn" onClick={startNewGame}>
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
