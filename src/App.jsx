import React, { useState, useEffect, useRef } from 'react';
import TileMap from './components/TileMap';
import QuizOverlay from './components/QuizOverlay';
import WordListPanel from './components/WordListPanel';
import { getRandomQuestion } from './utils/questions';
import { exportStatsToCSV } from './utils/stats';
import {
  generateStarterDeck,
  getRandomRewardCards,
  createCardInstance,
  CARDS_DB
} from './utils/cards';
import {
  playMoveSound,
  playHitSound,
  playHurtSound,
  playLevelUpSound,
  playGameOverSound,
  playVictorySound,
  playIncorrectSound
} from './utils/sound';
import './App.css';

// Grid Dimensions
const COLS = 100;
const ROWS = 100;

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
  const minSize = 5;
  const maxRooms = 35;

  // 2. Generate random rooms
  for (let i = 0; i < maxRooms; i++) {
    // Dynamic max size for some larger rooms
    const currentMaxSize = Math.random() < 0.2 ? 12 : 8;
    const w = Math.floor(Math.random() * (currentMaxSize - minSize + 1)) + minSize;
    const h = Math.floor(Math.random() * (currentMaxSize - minSize + 1)) + minSize;
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
    { subType: 'slime', char: 's', name: 'スライム', hp: 14, atk: 5, def: 0, xp: 6, gold: 4 },
    { subType: 'bat', char: 'b', name: 'コウモリ', hp: 10, atk: 6, def: 1, xp: 10, gold: 5 },
    { subType: 'skeleton', char: 'S', name: 'スケルトン', hp: 24, atk: 9, def: 2, xp: 18, gold: 10 },
    { subType: 'ghost', char: 'G', name: 'ゴースト', hp: 20, atk: 8, def: 3, xp: 25, gold: 13 },
    { subType: 'werewolf', char: 'w', name: 'ウェアウルフ', hp: 35, atk: 12, def: 2, xp: 40, gold: 20 },
    { subType: 'vampire', char: 'V', name: 'ヴァンパイア', hp: 45, atk: 14, def: 4, xp: 55, gold: 30 },
    { subType: 'demon', char: 'd', name: 'デーモン', hp: 60, atk: 18, def: 5, xp: 80, gold: 45 },
    { subType: 'dragon', char: 'D', name: 'ドラゴン', hp: 100, atk: 25, def: 8, xp: 150, gold: 80 }
  ];

  // Limit enemy pool depending on floor difficulty
  let activePool = enemyTypes.slice(0, 2); // Slime and Bat
  if (floor >= 2) activePool = enemyTypes.slice(0, 3); // + Skeleton
  if (floor >= 3) activePool = enemyTypes.slice(0, 4); // + Ghost
  if (floor >= 4) activePool = enemyTypes.slice(1, 5); // Bat ~ Werewolf
  if (floor >= 5) activePool = enemyTypes.slice(2, 6); // Skeleton ~ Vampire
  if (floor >= 7) activePool = enemyTypes.slice(4, 7); // Werewolf ~ Demon
  if (floor >= 9) activePool = enemyTypes.slice(5, 8); // Vampire ~ Dragon

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

  return { grid, rooms, enemies, items, startPos };
};

// Initial Player Stats
const INITIAL_PLAYER = {
  x: 0,
  y: 0,
  hp: 80,
  maxHp: 80,
  atk: 7,
  def: 2,
  level: 1,
  xp: 0,
  xpNeeded: 20,
  gold: 0,
  floor: 1,
  swordEquipped: false,
  shieldEquipped: false,
  deck: []
};

// Enemy Intention generator
const rollEnemyIntent = (enemy, turnNumber) => {
  const seed = Math.random();
  const subType = enemy.subType;
  const atk = enemy.atk;
  
  if (subType === 'slime') {
    if (seed < 0.5) {
      return { type: 'attack', damage: atk, name: 'たいあたり', text: `こうげき (${atk}ダメージ)` };
    } else {
      return { type: 'defend', block: 4, name: 'からをふくらます', text: `ぼうぎょ (4ブロック)` };
    }
  } else if (subType === 'bat') {
    if (seed < 0.5) {
      return { type: 'attack', damage: Math.max(2, atk - 1), name: 'ひっかき', text: `こうげき (${Math.max(2, atk - 1)}ダメージ)` };
    } else {
      return { type: 'attack', damage: atk, name: 'かみつき', text: `こうげき (${atk}ダメージ)` };
    }
  } else if (subType === 'skeleton') {
    if (turnNumber % 3 === 0) {
      return { type: 'attack', damage: atk + 4, name: 'かぶとわり', text: `つよいこうげき (${atk + 4}ダメージ)` };
    } else if (seed < 0.5) {
      return { type: 'defend', block: 6, name: 'たてをかまえる', text: `ぼうぎょ (6ブロック)` };
    } else {
      return { type: 'attack', damage: atk, name: 'なぎはらい', text: `こうげき (${atk}ダメージ)` };
    }
  } else if (subType === 'ghost') {
    if (seed < 0.4) {
      return { type: 'attack', damage: atk, name: 'のろいのひかり', text: `こうげき (${atk}ダメージ)` };
    } else if (seed < 0.7) {
      return { type: 'defend', block: 8, name: 'おんりょうのたて', text: `ぼうぎょ (8ブロック)` };
    } else {
      return { type: 'attack', damage: atk + 2, name: 'ポルターガイスト', text: `つよいこうげき (${atk + 2}ダメージ)` };
    }
  } else if (subType === 'werewolf') {
    if (turnNumber % 2 === 0) {
      return { type: 'attack', damage: atk + 3, name: 'れんぞくひっかき', text: `つよいこうげき (${atk + 3}ダメージ)` };
    } else if (seed < 0.3) {
      return { type: 'defend', block: 5, name: 'みをかがめる', text: `ぼうぎょ (5ブロック)` };
    } else {
      return { type: 'attack', damage: atk, name: 'かみつき', text: `こうげき (${atk}ダメージ)` };
    }
  } else if (subType === 'vampire') {
    if (seed < 0.4) {
      return { type: 'attack', damage: atk + 5, name: 'きゅうけつ', text: `きゅうけつこうげき (${atk + 5}ダメージ)` };
    } else if (seed < 0.7) {
      return { type: 'defend', block: 10, name: 'コウモリのむれ', text: `ぼうぎょ (10ブロック)` };
    } else {
      return { type: 'attack', damage: atk, name: 'やみのはどう', text: `こうげき (${atk}ダメージ)` };
    }
  } else if (subType === 'demon') {
    if (turnNumber % 3 === 0) {
      return { type: 'attack', damage: atk + 10, name: 'じごくのほのお', text: `ぜんたいこうげき (${atk + 10}ダメージ)` };
    } else if (seed < 0.5) {
      return { type: 'defend', block: 15, name: 'まほうのバリア', text: `ぼうぎょ (15ブロック)` };
    } else {
      return { type: 'attack', damage: atk + 2, name: 'ダークスラッシュ', text: `つよいこうげき (${atk + 2}ダメージ)` };
    }
  } else if (subType === 'dragon') {
    if (turnNumber % 4 === 0) {
      return { type: 'attack', damage: atk + 20, name: 'ドラゴンブレス', text: `ひっさつこうげき (${atk + 20}ダメージ)` };
    } else if (seed < 0.4) {
      return { type: 'defend', block: 20, name: 'はがねのうろこ', text: `ぼうぎょ (20ブロック)` };
    } else {
      return { type: 'attack', damage: atk + 5, name: 'かみくだき', text: `つよいこうげき (${atk + 5}ダメージ)` };
    }
  }
  
  return { type: 'attack', damage: atk, name: 'こうげき', text: `こうげき (${atk}ダメージ)` };
};

function App() {
  const [player, setPlayer] = useState(INITIAL_PLAYER);
  const [grid, setGrid] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [exploredTiles, setExploredTiles] = useState({});
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameVictory, setGameVictory] = useState(false);

  // Card deck-building RPG States
  const [battle, setBattle] = useState(null);
  const [campsite, setCampsite] = useState(null);
  const [cardReward, setCardReward] = useState(null);

  // Quiz and Word Learning States
  const [customWords, setCustomWords] = useState([]);
  const [learnedWords, setLearnedWords] = useState({});
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [rightTab, setRightTab] = useState('status'); // 'status' or 'wordlist'

  const logEndRef = useRef(null);
  const [showDpad, setShowDpad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate Fog of War visibility
  useEffect(() => {
    if (grid.length === 0 || rooms.length === 0) return;
    
    setExploredTiles(prev => {
      const next = { ...prev };
      let changed = false;
      
      const mark = (x, y) => {
        const key = `${x},${y}`;
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      };

      // Reveal 5x5 around player
      for(let r = -2; r <= 2; r++) {
        for(let c = -2; c <= 2; c++) {
          mark(player.x + c, player.y + r);
        }
      }
      
      // If in a room, reveal the whole room
      for (const room of rooms) {
        if (player.x >= room.x && player.x < room.x + room.w &&
            player.y >= room.y && player.y < room.y + room.h) {
          for(let r = room.y - 1; r <= room.y + room.h; r++) {
            for(let c = room.x - 1; c <= room.x + room.w; c++) {
              mark(c, r);
            }
          }
        }
      }
      
      return changed ? next : prev;
    });
  }, [player.x, player.y, grid, rooms]);

  const [windows, setWindows] = useState(() => {
    const saved = localStorage.getItem('learning_rpg_windows');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.map && parsed.status && parsed.logs && parsed.legend && parsed.wordlist) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      map: { x: 10, y: 10, width: 440, height: 490, zIndex: 10, visible: true },
      status: { x: 460, y: 10, width: 280, height: 320, zIndex: 10, visible: true },
      logs: { x: 750, y: 10, width: 330, height: 200, zIndex: 10, visible: true },
      legend: { x: 750, y: 220, width: 330, height: 180, zIndex: 10, visible: true },
      wordlist: { x: 100, y: 50, width: 560, height: 380, zIndex: 5, visible: false },
      settings: { x: 200, y: 150, width: 400, height: 400, zIndex: 10, visible: false }
    };
  });

  const bringToFront = (id) => {
    setWindows(prev => {
      const maxZ = Object.values(prev).reduce((max, w) => Math.max(max, w.zIndex || 0), 0);
      const updated = {
        ...prev,
        [id]: { ...prev[id], zIndex: maxZ + 1 }
      };
      localStorage.setItem('learning_rpg_windows', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleWindow = (id) => {
    setWindows(prev => {
      const maxZ = Object.values(prev).reduce((max, w) => Math.max(max, w.zIndex || 0), 0);
      const updated = {
        ...prev,
        [id]: { 
          ...prev[id], 
          visible: !prev[id].visible,
          zIndex: !prev[id].visible ? maxZ + 1 : prev[id].zIndex
        }
      };
      localStorage.setItem('learning_rpg_windows', JSON.stringify(updated));
      return updated;
    });
  };

  const updateWindow = (id, params) => {
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], ...params }
    }));
  };

  const resetWindows = () => {
    const defaults = {
      map: { x: 10, y: 10, width: 440, height: 490, zIndex: 10, visible: true },
      status: { x: 460, y: 10, width: 280, height: 320, zIndex: 10, visible: true },
      logs: { x: 750, y: 10, width: 330, height: 200, zIndex: 10, visible: true },
      legend: { x: 750, y: 220, width: 330, height: 180, zIndex: 10, visible: true },
      wordlist: { x: 100, y: 50, width: 560, height: 380, zIndex: 5, visible: false },
      settings: { x: 200, y: 150, width: 400, height: 400, zIndex: 10, visible: false }
    };
    setWindows(defaults);
    localStorage.setItem('learning_rpg_windows', JSON.stringify(defaults));
  };

  const handleDragStart = (id, e) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;
    
    bringToFront(id);

    const startX = clientX;
    const startY = clientY;
    const winX = windows[id].x;
    const winY = windows[id].y;

    const handleDragMove = (moveEvent) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const dx = currentX - startX;
      const dy = currentY - startY;

      updateWindow(id, {
        x: Math.max(0, winX + dx),
        y: Math.max(0, winY + dy)
      });
    };

    const handleDragEnd = () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);

      setWindows(latest => {
        localStorage.setItem('learning_rpg_windows', JSON.stringify(latest));
        return latest;
      });
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);
  };

  const handleResizeStart = (id, e) => {
    e.stopPropagation();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    bringToFront(id);

    const startX = clientX;
    const startY = clientY;
    const winW = windows[id].width;
    const winH = windows[id].height;

    const minWidth = id === 'map' ? 360 : id === 'status' ? 250 : 200;
    const minHeight = id === 'map' ? 400 : id === 'status' ? 240 : 120;

    const handleResizeMove = (moveEvent) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const dx = currentX - startX;
      const dy = currentY - startY;

      updateWindow(id, {
        width: Math.max(minWidth, winW + dx),
        height: Math.max(minHeight, winH + dy)
      });
    };

    const handleResizeEnd = () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchmove', handleResizeMove);
      window.removeEventListener('touchend', handleResizeEnd);

      setWindows(latest => {
        localStorage.setItem('learning_rpg_windows', JSON.stringify(latest));
        return latest;
      });
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove, { passive: true });
    window.addEventListener('touchend', handleResizeEnd);
  };

  // Prevent scroll locks auto scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.scrollTo(0, 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCardClick = (card) => {
    if (gameOver || gameVictory || !battle) return;

    // まちがえた問題のIDリストを作る
    const reviewIds = Object.keys(learnedWords)
      .filter(k => learnedWords[k].isReview)
      .map(k => parseInt(k));

    const questionObj = getRandomQuestion(player.floor, reviewIds);

    setActiveQuiz({
      questionObj,
      type: 'card',
      card: card
    });
  };

  const handleEndTurn = () => {
    if (gameOver || gameVictory || activeQuiz || !battle) return;
    
    let nextBattle = { ...battle };
    let nextPlayer = { ...player };
    
    // 1. 敵の行動（意図）を実行する
    const intent = nextBattle.enemyIntent;
    if (intent) {
      addLog(`${nextBattle.enemy.name} のターン: 「${intent.name}」を使用！`, 'system');
      
      if (intent.damage !== undefined) {
        let currentDmg = intent.damage;
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
          addLog(`プレイヤーは ${finalDmg} ダメージを受けた！`, 'damage-taken');
          playHurtSound();
          
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
      
      if (intent.block !== undefined) {
        nextBattle.enemyBlock += intent.block;
        addLog(`${nextBattle.enemy.name} は ${intent.block} のブロックを得た。`, 'system');
      }
    }
    
    // 2. ターンの開始準備
    nextBattle.turn += 1;
    nextBattle.playerBlock = 0; // ブロックは毎ターンリセットされます
    nextBattle.playerEnergy = nextBattle.playerMaxEnergy; // 互換性のために初期化

    // 手札を捨てて、山札から3枚引きます
    nextBattle.discardPile = [...nextBattle.discardPile, ...nextBattle.hand];
    nextBattle.hand = [];
    
    let drawPile = [...nextBattle.drawPile];
    let discardPile = [...nextBattle.discardPile];
    let hand = [];
    
    for (let i = 0; i < 3; i++) {
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
  };

  const renderBattleContent = () => {
    if (!battle) return null;
    const { enemy, enemyBlock, enemyStatus, enemyIntent, turn, playerEnergy, playerBlock, playerStatus, hand, drawPile, discardPile, exhaustChoose } = battle;

    const getEnemySprite = (subType) => {
      switch(subType) {
        case 'slime': return '🟢';
        case 'bat': return '🦇';
        case 'skeleton': return '💀';
        case 'ghost': return '👻';
        default: return '👾';
      }
    };

    const getIntentionIcon = (intent) => {
      if (!intent) return '❓';
      switch(intent.type) {
        case 'attack': return intent.multi ? '⚔️⚔️' : '⚔️';
        case 'defend': return '🛡️';
        case 'debuff': return '✨';
        default: return '💤';
      }
    };

    return (
      <div className="battle-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '6px', boxSizing: 'border-box', background: '#09090b', border: '1px solid #ff3e3e', borderRadius: '8px', color: '#f3f4f6', gap: '6px' }}>
        
        {/* Arena */}
        <div className="battle-arena" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, minHeight: '130px', padding: '4px', borderBottom: '1px dashed #27272a' }}>
          
          {/* Player */}
          <div className="battle-character player-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '2px' }}>🛡️👤</div>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#ff3e3e' }}>ゆうしゃ</div>
            
            <div style={{ width: '100%', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '1px' }}>
                <span>HP: {player.hp} / {player.maxHp}</span>
                {playerBlock > 0 && <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>🛡️ {playerBlock}</span>}
              </div>
              <div style={{ height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#ef4444', width: `${(player.hp / player.maxHp) * 100}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>

          {/* Turn Marker */}
          <div style={{ fontSize: '0.65rem', color: '#71717a', textAlign: 'center' }}>
            <div>ターン</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff3e3e' }}>{turn}</div>
          </div>

          {/* Enemy */}
          <div className="battle-character enemy-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '2px' }}>{getEnemySprite(enemy.subType)}</div>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#f87171' }}>{enemy.name}</div>
            
            <div style={{ width: '100%', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '1px' }}>
                <span>HP: {enemy.hp} / {enemy.maxHp}</span>
                {enemyBlock > 0 && <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>🛡️ {enemyBlock}</span>}
              </div>
              <div style={{ height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#ef4444', width: `${(enemy.hp / enemy.maxHp) * 100}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>

            {enemyIntent && (
              <div style={{ marginTop: '4px', background: '#1c1917', border: '1px solid #44403c', borderRadius: '4px', padding: '1px 4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }} title={enemyIntent.text}>
                <span>{getIntentionIcon(enemyIntent)}</span>
                <span style={{ color: '#d6d3d1' }}>{enemyIntent.name}</span>
                <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                  {enemyIntent.damage !== undefined ? `${enemyIntent.damage}` : ''}
                  {enemyIntent.block !== undefined ? `+${enemyIntent.block}🛡️` : ''}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Feedback / Instructions */}
        <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#71717a', minHeight: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span>カードをえらんで、えいたんごクイズにこたえよう！</span>
        </div>

        {/* Card Hand and Turn controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px', justifyContent: 'center' }}>
            {hand.map((card) => {
              const borderCol = card.type === 'attack' ? '#ff3e3e' : '#3b82f6';
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  style={{
                    flex: '0 0 92px',
                    height: '110px',
                    border: `1px solid ${borderCol}`,
                    borderRadius: '4px',
                    background: '#040405',
                    color: '#f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: `0 0 6px ${borderCol}60`,
                    transition: 'transform 0.15s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px', color: card.type === 'attack' ? '#fca5a5' : '#93c5fd' }}>
                        {card.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.55rem', color: '#9ca3af', lineHeight: '1.2', maxHeight: '55px', overflow: 'hidden', wordBreak: 'break-all' }}>
                      {card.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '4px' }}>
            <button
              onClick={handleEndTurn}
              style={{
                padding: '4px 10px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.72rem',
              }}
            >
              ターン終了
            </button>
          </div>
        </div>

      </div>
    );
  };

  const renderCampsiteContent = () => {
    if (!campsite) return null;
    const { showSmithDeck } = campsite;

    const handleRest = () => {
      setPlayer(prev => ({ ...prev, hp: prev.maxHp }));
      addLog(`🛌 やすむ をえらんだ。キャンプでゆっくりやすみ、HPが ぜんぶ かいふくした！`, 'system');
      playLevelUpSound();
      
      setTimeout(() => {
        loadNextFloor(campsite.nextFloorNum);
        setCampsite(null);
      }, 1200);
    };

    const handleSmithSelectCard = (card) => {
      const updatedDeck = player.deck.map(c => {
        if (c.id === card.id) {
          return createCardInstance(c.key, true);
        }
        return c;
      });

      setPlayer(prev => ({ ...prev, deck: updatedDeck }));
      addLog(`🔨 きたえる をえらんだ。カード「${card.name}」を「${card.name}+」につよくした！`, 'level-up');
      playLevelUpSound();

      loadNextFloor(campsite.nextFloorNum);
      setCampsite(null);
    };

    return (
      <div className="campsite-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '12px', boxSizing: 'border-box', background: 'radial-gradient(circle, #2d1b10 0%, #0c0602 100%)', border: '1px solid #d97706', borderRadius: '8px', color: '#f3f4f6', gap: '12px' }}>
        {!showSmithDeck ? (
          <>
            <div style={{ fontSize: '2.5rem', animation: 'pulse 2s infinite' }}>🔥</div>
            <h2 style={{ color: '#f59e0b', margin: 0, fontSize: '1.1rem' }}>キャンプ（休憩場所）</h2>
            <p style={{ fontSize: '0.70rem', color: '#d1d5db', textAlign: 'center', maxWidth: '280px', lineHeight: '1.3' }}>
              つぎのフロアへすすむまえに、たきびのそばでゆっくりやすむか、カードを1枚つよくできます。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '200px', marginTop: '6px' }}>
              <button
                onClick={handleRest}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'linear-gradient(to right, #0f766e, #0d9488)',
                  color: '#fff',
                  border: '1px solid #14b8a6',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <span>🛌 やすむ</span>
                <span style={{ fontSize: '0.65rem' }}>HP ぜんぶかいふく</span>
              </button>
              
              <button
                onClick={() => setCampsite(prev => ({ ...prev, showSmithDeck: true }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'linear-gradient(to right, #b45309, #d97706)',
                  color: '#fff',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <span>🔨 きたえる</span>
                <span style={{ fontSize: '0.65rem' }}>カードをつよくする</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '0.8rem' }}>つよくするカードをえらんでね:</span>
              <button
                onClick={() => setCampsite(prev => ({ ...prev, showSmithDeck: false }))}
                style={{ padding: '2px 6px', background: '#374151', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }}
              >
                もどる
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {player.deck.map((card, idx) => {
                  const canUpgrade = !card.upgraded;
                  return (
                    <button
                      key={card.id || idx}
                      disabled={!canUpgrade}
                      onClick={() => handleSmithSelectCard(card)}
                      style={{
                        padding: '4px',
                        background: '#1f2937',
                        border: `1px solid ${card.upgraded ? '#4b5563' : '#f59e0b'}`,
                        borderRadius: '4px',
                        color: card.upgraded ? '#9ca3af' : '#fff',
                        textAlign: 'left',
                        cursor: canUpgrade ? 'pointer' : 'default',
                        opacity: canUpgrade ? 1 : 0.6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: card.upgraded ? '#9ca3af' : '#fef08a' }}>
                        {card.name}
                      </div>
                      <div style={{ fontSize: '0.58rem', lineHeight: '1.2' }}>
                        {card.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCardRewardContent = () => {
    if (!cardReward) return null;
    const { choices, gold, xp } = cardReward;

    const handleSelectCard = (card) => {
      setPlayer(prev => ({
        ...prev,
        deck: [...prev.deck, card]
      }));
      addLog(`🎁 デッキに「${card.name}」を追加した。`, 'system');
      setCardReward(null);
    };

    const handleSkip = () => {
      addLog("🎁 カード報酬をスキップした。", 'system');
      setCardReward(null);
    };

    return (
      <div className="reward-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '10px', boxSizing: 'border-box', background: '#0a0a0c', border: '1px solid #10b981', borderRadius: '8px', color: '#f3f4f6', gap: '8px' }}>
        <h2 style={{ color: '#10b981', margin: 0, fontSize: '1rem' }}>戦闘勝利！獲得報酬</h2>
        
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', background: '#18181b', padding: '4px 8px', borderRadius: '4px' }}>
          <span style={{ color: '#fbbf24' }}>🪙 +{gold} G</span>
          <span style={{ color: '#60a5fa' }}>✨ +{xp} XP</span>
        </div>

        <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
          デッキに加えるカードを選んでください：
        </div>

        <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}>
          {choices.map((card, idx) => {
            const borderCol = card.type === 'attack' ? '#ff3e3e' : card.type === 'skill' ? '#3b82f6' : '#eab308';
            return (
              <button
                key={card.id || idx}
                onClick={() => handleSelectCard(card)}
                style={{
                  flex: '0 1 100px',
                  height: '120px',
                  border: `1px solid ${borderCol}`,
                  borderRadius: '4px',
                  background: '#020617',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: `0 3px 5px rgba(0, 0, 0, 0.3)`,
                  transition: 'transform 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.62rem', color: card.type === 'attack' ? '#fca5a5' : card.type === 'skill' ? '#93c5fd' : '#fef08a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px' }}>
                      {card.name}
                    </span>
                    <span style={{
                      background: borderCol,
                      color: '#000',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '12px',
                      height: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem'
                    }}>
                      {card.cost}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: '#d1d5db', lineHeight: '1.2', maxHeight: '65px', overflow: 'hidden' }}>
                    {card.desc}
                  </div>
                </div>
                <div style={{ fontSize: '0.5rem', color: '#71717a' }}>
                  <span>{card.rarity}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSkip}
          style={{
            padding: '3px 10px',
            background: '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.65rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          スキップ
        </button>
      </div>
    );
  };

  const renderExplorationMapContent = () => (
    <div className="map-panel-body" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
        <button 
          type="button" 
          className="layout-ctrl-btn" 
          onClick={() => setShowDpad(prev => !prev)} 
          style={{ color: showDpad ? '#00ff66' : '#888' }}
          title="コントローラーの表示/非表示"
        >
          {showDpad ? '🎮 パッド非表示' : '🎮 パッド表示'}
        </button>
      </div>
      <div className="map-container-wrapper">
        <TileMap grid={renderGrid} />
      </div>
      <div className="controls-wrapper" style={{ width: '100%' }}>
        {showDpad ? (
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
        ) : (
          <div className="keyboard-hint" style={{ fontSize: '0.72rem', color: '#71717a', textAlign: 'center', padding: '0.5rem', border: '1px dashed #27272a', borderRadius: '8px', lineHeight: '1.3' }}>
            ⌨️ 矢印キー / WASD<br/>で移動できます。<br/>Spaceで待機。
          </div>
        )}
      </div>
    </div>
  );

  const renderMapContent = () => {
    if (activeQuiz) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <QuizOverlay
            questionObj={activeQuiz.questionObj}
            onCorrect={() => resolveCombatTurn(true)}
            onIncorrect={() => resolveCombatTurn(false)}
          />
        </div>
      );
    }
    if (campsite) {
      return renderCampsiteContent();
    }
    if (cardReward) {
      return renderCardRewardContent();
    }
    if (battle) {
      return renderBattleContent();
    }
    return renderExplorationMapContent();
  };

  const renderStatusContent = () => (
    <div style={{ width: '100%' }}>
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
          <span className="stat-label">DECK SIZE</span>
          <span className="stat-value" style={{ color: '#ef4444' }}>{player.deck ? player.deck.length : 0} 枚</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">FLOOR</span>
          <span className="stat-value" style={{ color: '#c084fc' }}>B{player.floor}F</span>
        </div>
      </div>

      {/* Relics */}
      <div className="panel-title-sub" style={{ fontSize: '0.75rem', marginTop: '0.4rem', marginBottom: '0.2rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>
        EQUIPPED RELICS
      </div>
      <div className="inventory-list">
        <div className={`inventory-slot ${player.swordEquipped ? 'equipped' : ''}`}>
          <span className="equip-icon">{player.swordEquipped ? '🗡️' : '➖'}</span>
          <span>{player.swordEquipped ? '鉄の剣 (開始時 筋力+2)' : '遺物スロット'}</span>
        </div>
        <div className={`inventory-slot ${player.shieldEquipped ? 'equipped' : ''}`}>
          <span className="equip-icon">{player.shieldEquipped ? '🛡️' : '➖'}</span>
          <span>{player.shieldEquipped ? '鉄の盾 (開始時 3ブ & 金+2)' : '遺物スロット'}</span>
        </div>
      </div>
    </div>
  );

  const renderLogsContent = () => (
    <div className="log-container" style={{ height: '100%', minHeight: '80px' }}>
      {logs.map((log, index) => (
        <div key={index} className={`log-entry ${log.type}`}>
          <small style={{ color: '#52525b', marginRight: '6px' }}>[{log.time}]</small>
          {log.text}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );

  const renderLegendContent = () => (
    <div className="legend-box">
      <div className="legend-item"><span className="legend-symbol tile-player">@</span><span>自分</span></div>
      <div className="legend-item"><span className="legend-symbol tile-wall">#</span><span>壁</span></div>
      <div className="legend-item"><span className="legend-symbol tile-floor">.</span><span>床</span></div>
      <div className="legend-item"><span className="legend-symbol tile-enemy">s/S</span><span>敵</span></div>
      <div className="legend-item"><span className="legend-symbol tile-item tile-sub-potion">P</span><span>回復薬</span></div>
      <div className="legend-item"><span className="legend-symbol tile-item tile-sub-chest">C</span><span>宝箱</span></div>
      <div className="legend-item"><span className="legend-symbol tile-item tile-sub-sword">W</span><span>剣 (遺物)</span></div>
      <div className="legend-item"><span className="legend-symbol tile-item tile-sub-shield">D</span><span>盾 (遺物)</span></div>
      <div className="legend-item"><span className="legend-symbol tile-stairs">&gt;</span><span>階段</span></div>
    </div>
  );
  // ==============================
  // Settings & System Handlers
  // ==============================
  
  const handleExportSave = () => {
    const data = {
      learning_rpg_windows: localStorage.getItem('learning_rpg_windows'),
      learning_rpg_stats: localStorage.getItem('learning_rpg_stats'),
      learning_rpg_custom_questions: localStorage.getItem('learning_rpg_custom_questions')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning_rpg_save_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSave = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.learning_rpg_windows) localStorage.setItem('learning_rpg_windows', data.learning_rpg_windows);
        if (data.learning_rpg_stats) localStorage.setItem('learning_rpg_stats', data.learning_rpg_stats);
        if (data.learning_rpg_custom_questions) localStorage.setItem('learning_rpg_custom_questions', data.learning_rpg_custom_questions);
        alert('セーブデータを読み込みました！ページを更新します。');
        window.location.reload();
      } catch (err) {
        alert('セーブデータの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const customQuestions = [];
        // Expected format: id,category,type,question,answer,choices(comma separated if choice type)
        // Skip header if first line contains "id"
        let startIndex = lines[0].toLowerCase().includes('id') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',');
          if (parts.length < 5) continue;
          
          const type = parts[2].trim();
          const qObj = {
            id: parseInt(parts[0].trim()) || (1000 + i),
            category: parts[1].trim(),
            type: type,
            question: parts[3].trim(),
            answer: parts[4].trim(),
          };
          
          if (type === 'choice' && parts.length >= 8) {
            qObj.choices = [parts[4].trim(), parts[5].trim(), parts[6].trim(), parts[7].trim()];
          }
          
          customQuestions.push(qObj);
        }
        
        const existingCustom = JSON.parse(localStorage.getItem('learning_rpg_custom_questions') || '[]');
        const updatedCustom = [...existingCustom, ...customQuestions];
        localStorage.setItem('learning_rpg_custom_questions', JSON.stringify(updatedCustom));
        
        alert(`カスタム問題を ${customQuestions.length} 問追加しました！`);
      } catch (err) {
        alert('CSVの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const renderSettingsContent = () => {
    let stats = {};
    try {
      stats = JSON.parse(localStorage.getItem('learning_rpg_stats') || '{}');
    } catch(e) {}
    
    return (
      <div className="retro-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', overflowY: 'auto', background: '#09090b', color: '#e4e4e7' }}>
        <h3 style={{ margin: 0, color: '#facc15' }}>💾 セーブ＆ロード</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportSave} style={{ flex: 1, padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📥 セーブ書き出し
          </button>
          <label style={{ flex: 1, padding: '8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }}>
            📤 セーブ読み込み
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportSave} />
          </label>
        </div>
        
        <h3 style={{ margin: '10px 0 0', color: '#a78bfa' }}>📝 カスタム問題の追加 (CSV)</h3>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 5px' }}>
          フォーマット: ID, カテゴリ, type(choice/input), 問題文, 正解, ダミー1, ダミー2, ダミー3
        </p>
        <label style={{ padding: '8px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }}>
          📄 CSVファイルを読み込む
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
        </label>

        <h3 style={{ margin: '10px 0 0', color: '#4ade80' }}>📊 成績・学習記録</h3>
        <div style={{ marginBottom: '8px' }}>
          <button onClick={exportStatsToCSV} style={{ width: '100%', padding: '8px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📊 成績をCSVで書き出し (Excel用)
          </button>
        </div>
        
        {Object.keys(stats).length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: '#71717a' }}>まだ記録がありません。クイズに答えよう！</div>
        ) : (
          <div style={{ fontSize: '0.8rem', display: 'grid', gap: '4px' }}>
            {Object.entries(stats).map(([qId, s]) => {
              const total = s.correct + s.incorrect;
              const rate = total > 0 ? Math.round((s.correct / total) * 100) : 0;
              return (
                <div key={qId} style={{ background: '#18181b', padding: '6px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', borderLeft: `3px solid ${rate >= 80 ? '#4ade80' : rate <= 40 ? '#f87171' : '#facc15'}` }}>
                  <span>Q-ID: {qId}</span>
                  <span>正解: {s.correct} / 不正解: {s.incorrect} ({rate}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWordListContent = () => (
    <WordListPanel 
      learnedWords={learnedWords}
      customWordsCount={customWords.length}
      deck={player.deck}
      onImportCustomWords={(words) => {
        setCustomWords(words);
        addLog(`カスタム単語リスト (${words.length}語) を読み込みました！`, 'system');
      }}
      onClearCustomWords={() => {
        setCustomWords([]);
        addLog("デフォルトの単語リストに戻しました。", 'system');
      }}
    />
  );

  const renderMobilePanel = (title, content) => (
    <div className="panel" style={{ width: '100%', boxSizing: 'border-box' }}>
      <div className="panel-title">
        <span>{title}</span>
      </div>
      <div className="panel-body">
        {content}
      </div>
    </div>
  );

  const renderMobileContent = () => {
    if (rightTab === 'wordlist') {
      return renderWordListContent();
    }
    return (
      <>
        {renderMobilePanel('DUNGEON MAP', renderMapContent())}
        {renderMobilePanel('PLAYER STATUS', renderStatusContent())}
        {renderMobilePanel('ACTION LOGS', renderLogsContent())}
        {renderMobilePanel('LEGEND & KEY', renderLegendContent())}
      </>
    );
  };

  const renderWindow = (id, title, content) => {
    const win = windows[id];
    if (!win) return null;

    return (
      <div 
        key={id}
        className="window" 
        style={{
          position: 'absolute',
          left: `${win.x}px`,
          top: `${win.y}px`,
          width: `${win.width}px`,
          height: `${win.height}px`,
          zIndex: win.zIndex,
          display: win.visible ? 'flex' : 'none'
        }}
        onMouseDown={() => bringToFront(id)}
        onTouchStart={() => bringToFront(id)}
      >
        <div 
          className="window-header" 
          onMouseDown={(e) => handleDragStart(id, e)}
          onTouchStart={(e) => handleDragStart(id, e)}
        >
          <span className="window-title">{title}</span>
          <button className="window-close-btn" onClick={() => toggleWindow(id)}>✕</button>
        </div>
        <div className="window-body">
          {content}
        </div>
        <div 
          className="window-resize-handle" 
          onMouseDown={(e) => handleResizeStart(id, e)}
          onTouchStart={(e) => handleResizeStart(id, e)}
        ></div>
      </div>
    );
  };

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
    setRooms(dungeon.rooms);
    setEnemies(dungeon.enemies);
    setItems(dungeon.items);
    setExploredTiles({});
    setPlayer({
      ...INITIAL_PLAYER,
      x: dungeon.startPos.x,
      y: dungeon.startPos.y,
      deck: generateStarterDeck()
    });
    setGameOver(false);
    setGameVictory(false);
    setLogs([]);
    setActiveQuiz(null);
    setBattle(null);
    setCampsite(null);
    setCardReward(null);
    
    const welcomeMsgs = [
      "カードデッキ構築型 RPG へようこそ！",
      "探索操作: キーボードの矢印キー、WASD、または画面下のボタンで移動",
      "戦闘システム: 敵を踏むとStSカードバトル突入。単語を綴ってカードを発動せよ！",
      "Floor 5 の階段を降りればクリアです！ 生還を目指しましょう。"
    ];
    welcomeMsgs.forEach(msg => addLog(msg, 'system'));
  };

  // Set up next floor
  const loadNextFloor = (nextFloorNum) => {
    const dungeon = generateDungeon(nextFloorNum);
    setGrid(dungeon.grid);
    setRooms(dungeon.rooms);
    setEnemies(dungeon.enemies);
    setItems(dungeon.items);
    setExploredTiles({});
    
    setPlayer(prev => {
      return {
        ...prev,
        x: dungeon.startPos.x,
        y: dungeon.startPos.y,
        floor: nextFloorNum
      };
    });

    addLog(`地下 ${nextFloorNum} 階へ進んだ。敵はさらに手強くなっている！`, 'system');
  };

  // Resolve spelling quiz turn outcomes
  const resolveCombatTurn = (isCorrectAnswer) => {
    if (!activeQuiz || !battle) return;
    const { type, card } = activeQuiz;

    let nextBattle = { ...battle };
    let nextPlayer = { ...player };

    // 問題の正誤を記録する（IDをキーにして管理）
    const qId = String(activeQuiz.questionObj.id);
    setLearnedWords(prev => {
      const current = prev[qId] || {
        question: activeQuiz.questionObj.question,
        answer: activeQuiz.questionObj.answer,
        category: activeQuiz.questionObj.category,
        type: activeQuiz.questionObj.type,
        correctCount: 0,
        incorrectCount: 0,
        isReview: false
      };
      return {
        ...prev,
        [qId]: {
          ...current,
          correctCount: current.correctCount + (isCorrectAnswer ? 1 : 0),
          incorrectCount: current.incorrectCount + (isCorrectAnswer ? 0 : 1),
          isReview: !isCorrectAnswer
        }
      };
    });

    if (type === 'card') {
      if (isCorrectAnswer) {
        addLog(`【せいかい！】「${card.name}」をつかった！ (${activeQuiz.questionObj.category})`, 'system');
        playHitSound();

        const stateHelpers = {
          dealDamage: (dmg) => {
            let finalDmg = dmg + (nextPlayer.swordEquipped ? 2 : 0);
            let enemyBlock = nextBattle.enemyBlock;
            let damageToHp = finalDmg;
            
            if (enemyBlock > 0) {
              if (enemyBlock >= finalDmg) {
                nextBattle.enemyBlock -= finalDmg;
                damageToHp = 0;
                addLog(`てきのブロックがこうげきをふせいだ (のこりブロック: ${nextBattle.enemyBlock})`, 'system');
              } else {
                damageToHp = finalDmg - enemyBlock;
                nextBattle.enemyBlock = 0;
                addLog(`てきのブロックをつきやぶって、${damageToHp}のダメージをあたえた！`, 'system');
              }
            }

            if (damageToHp > 0) {
              nextBattle.enemy.hp = Math.max(0, nextBattle.enemy.hp - damageToHp);
              addLog(`${nextBattle.enemy.name} に ${damageToHp} のダメージ！`, 'damage-dealt');
            }
          },
          dealDamageToAll: (dmg) => {
            stateHelpers.dealDamage(dmg);
          },
          gainBlock: (blk) => {
            let finalBlk = blk + (nextPlayer.shieldEquipped ? 3 : 0);
            nextBattle.playerBlock += finalBlk;
            addLog(`ブロックを ${finalBlk} えた。`, 'system');
          },
          heal: (amount) => {
            nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + amount);
            addLog(`HPが ${amount} かいふくした！`, 'level-up');
          },
          applyStatus: () => {},
          applyStatusToAll: () => {},
          gainStrength: () => {},
          addTurnEndEffect: () => {},
          addPower: () => {},
          drawCards: () => {},
          addCardToDiscard: () => {},
          triggerExhaust: () => {}
        };

        const cardData = CARDS_DB[card.key];
        if (cardData) {
          cardData.effect(nextPlayer, null, card.upgraded, stateHelpers);
        }

        // つかったカードをすてふだにいれる
        const handIndex = nextBattle.hand.findIndex(c => c.id === card.id);
        if (handIndex !== -1) {
          const [playedCard] = nextBattle.hand.splice(handIndex, 1);
          nextBattle.discardPile.push(playedCard);
        }
      } else {
        addLog(`【まちがい！】「${card.name}」はつかえなかった。正解：${activeQuiz.questionObj.answer}`, 'damage-taken');
        playIncorrectSound();

        // しっぱいしたカードもすてふだにいれる
        const handIndex = nextBattle.hand.findIndex(c => c.id === card.id);
        if (handIndex !== -1) {
          const [discardedCard] = nextBattle.hand.splice(handIndex, 1);
          nextBattle.discardPile.push(discardedCard);
        }
      }

      // Check if enemy died
      if (nextBattle.enemy.hp <= 0) {
        addLog(`${nextBattle.enemy.name} を倒した！`, 'level-up');
        playVictorySound();
        
        const xpReward = nextBattle.enemy.xp;
        const goldReward = nextBattle.enemy.gold;
        nextPlayer.xp += xpReward;
        nextPlayer.gold += goldReward;

        if (nextPlayer.xp >= nextPlayer.xpNeeded) {
          nextPlayer.level += 1;
          nextPlayer.xp -= nextPlayer.xpNeeded;
          nextPlayer.xpNeeded = Math.round(nextPlayer.xpNeeded * 1.5);
          nextPlayer.maxHp += 8;
          nextPlayer.hp = nextPlayer.maxHp;
          nextPlayer.atk += 2;
          nextPlayer.def += 1;
          addLog(`レベルアップ！ レベル ${nextPlayer.level} になった！ (HP最大値+8、HP全回復)`, 'level-up');
          playLevelUpSound();
        }

        const enemyX = nextBattle.enemy.x;
        const enemyY = nextBattle.enemy.y;
        const nextEnemies = enemies.filter(e => !(e.x === enemyX && e.y === enemyY));
        setEnemies(nextEnemies);

        setBattle(null);
        setPlayer(nextPlayer);
        setCardReward({
          choices: getRandomRewardCards(nextPlayer.floor),
          gold: goldReward,
          xp: xpReward
        });
        setActiveQuiz(null);
        return;
      }

      setBattle(nextBattle);
      setPlayer(nextPlayer);
    }
    setActiveQuiz(null);
  };

  // Turn logic execution (Synchronous State Resolution)
  const handleMove = (dx, dy) => {
    if (gameOver || gameVictory || activeQuiz || battle || campsite || cardReward) return;

    const tx = player.x + dx;
    const ty = player.y + dy;

    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;

    const targetTile = grid[ty][tx];
    if (targetTile.type === 'wall') return;

    let nextPlayer = { ...player };
    let nextEnemies = [...enemies];
    let nextItems = [...items];
    let turnConsumed = false;

    // Check for Enemy
    const enemyIndex = nextEnemies.findIndex(e => e.x === tx && e.y === ty);
    
    if (enemyIndex !== -1) {
      const enemy = nextEnemies[enemyIndex];
      let deck = player.deck || [];
      if (deck.length === 0) {
        deck = generateStarterDeck();
      }

      let drawPile = [...deck];
      drawPile.sort(() => Math.random() - 0.5);

      let hand = [];
      for (let i = 0; i < 3; i++) {
        if (drawPile.length > 0) {
          hand.push(drawPile.pop());
        }
      }

      let startingBlock = 0;
      if (player.shieldEquipped) {
        startingBlock = 3;
      }

      const initialBattle = {
        enemy: { ...enemy },
        enemyBlock: 0,
        enemyStatus: { vulnerable: 0, weak: 0, strength: 0 },
        enemyIntent: rollEnemyIntent(enemy, 1),
        turn: 1,
        drawPile: drawPile,
        hand: hand,
        discardPile: [],
        exhaustPile: [],
        playerEnergy: 3,
        playerMaxEnergy: 3,
        playerBlock: startingBlock,
        playerStatus: {
          strength: 0,
          vulnerable: 0,
          weak: 0,
          barricade: 0,
          metallicize: 0,
          demonForm: 0
        },
        logs: [],
        turnEndEffects: [],
        exhaustChoose: false
      };

      setBattle(initialBattle);
      addLog(`戦闘開始！ ${enemy.name} が現れた。`, 'system');
      return;
    } else {
      // Check for Items
      const itemIndex = nextItems.findIndex(i => i.x === tx && i.y === ty);

      if (itemIndex !== -1) {
        const item = nextItems[itemIndex];
        
        if (item.subType === 'potion') {
          const recoverAmount = 25;
          nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + recoverAmount);
          addLog(`${item.name} を拾って使用した。HP が ${recoverAmount} 回復した。`, 'item-pickup');
        } else if (item.subType === 'chest') {
          const goldAmount = Math.floor(Math.random() * 16) + 15;
          nextPlayer.gold += goldAmount;
          addLog(`${item.name} を開けた！ ${goldAmount} ゴールドを獲得。`, 'item-pickup');
        } else if (item.subType === 'sword') {
          nextPlayer.swordEquipped = true;
          addLog(`遺物「${item.name}」を手に入れた！(こうげきダメージが 2 ふえる！)`, 'item-pickup');
        } else if (item.subType === 'shield') {
          nextPlayer.shieldEquipped = true;
          addLog(`遺物「${item.name}」を手に入れた！(ぼうぎょのブロックが 3 ふえる！)`, 'item-pickup');
        }

        nextItems.splice(itemIndex, 1);
      }

      nextPlayer.x = tx;
      nextPlayer.y = ty;
      playMoveSound();

      if (targetTile.type === 'stairs') {
        if (nextPlayer.floor === 10) {
          setGameVictory(true);
          addLog("階段を降り、ダンジョンからの脱出に成功した！", 'system');
          addLog("おめでとうございます！完全勝利です！", 'level-up');
          playVictorySound();
          return;
        } else {
          setCampsite({
            nextFloorNum: nextPlayer.floor + 1,
            showSmithDeck: false
          });
          return;
        }
      }

      turnConsumed = true;
    }

    // Process Enemy chase AI
    if (turnConsumed) {
      nextEnemies = nextEnemies.map(enemy => {
        const dx = nextPlayer.x - enemy.x;
        const dy = nextPlayer.y - enemy.y;
        const dist = Math.abs(dx) + Math.abs(dy);

        if (dist === 1) {
          return enemy;
        } else if (dist <= 5) {
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

      setPlayer(nextPlayer);
      setEnemies(nextEnemies);
      setItems(nextItems);
    }
  };

  const handleWait = () => {
    if (gameOver || gameVictory || activeQuiz || battle || campsite || cardReward) return;

    addLog("あなたは立ち止まって周囲を警戒した。", 'system');
    playMoveSound();

    let nextEnemies = [...enemies];
    nextEnemies = nextEnemies.map(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist > 1 && dist <= 5) {
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);

        let nextX = enemy.x + stepX;
        let nextY = enemy.y;

        let isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
        let isOccupied = nextEnemies.some(e => e.x === nextX && e.y === nextY) || (nextX === player.x && nextY === player.y);

        if (isBlocked || isOccupied) {
          nextX = enemy.x;
          nextY = enemy.y + stepY;
          isBlocked = grid[nextY] && grid[nextY][nextX] && grid[nextY][nextX].type === 'wall';
          isOccupied = nextEnemies.some(e => e.x === nextX && e.y === nextY) || (nextX === player.x && nextY === player.y);
        }

        if (!isBlocked && !isOccupied) {
          return { ...enemy, x: nextX, y: nextY };
        }
      }
      return enemy;
    });

    setEnemies(nextEnemies);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver || gameVictory || activeQuiz || battle || campsite || cardReward) return;

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
        case ' ':
          e.preventDefault();
          handleWait();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, grid, enemies, items, gameOver, gameVictory, activeQuiz, battle, campsite, cardReward]);

  const VIEWPORT_RADIUS = 10;
  const renderGrid = [];
  
  if (grid.length > 0) {
    for (let r = player.y - VIEWPORT_RADIUS; r <= player.y + VIEWPORT_RADIUS; r++) {
      const row = [];
      for (let c = player.x - VIEWPORT_RADIUS; c <= player.x + VIEWPORT_RADIUS; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) {
          row.push({ char: ' ', type: 'void' });
          continue;
        }

        const isExplored = exploredTiles[`${c},${r}`];
        if (!isExplored) {
          row.push({ char: ' ', type: 'fog' });
          continue;
        }

        let tile = grid[r][c];

        if (player.x === c && player.y === r && !gameOver) {
          tile = { char: '@', type: 'player' };
        } else {
          const enemy = enemies.find(e => e.x === c && e.y === r);
          if (enemy) {
            tile = { char: enemy.char, type: 'enemy', subType: enemy.subType };
          } else {
            const item = items.find(i => i.x === c && i.y === r);
            if (item) {
              tile = { char: item.char, type: 'item', subType: item.subType };
            }
          }
        }
        
        row.push(tile);
      }
      renderGrid.push(row);
    }
  }

  return (
    <div className="app-container retro-theme">
      <header className="app-header">
        <div className="header-left">
          <h1>ROGUE-TEXT RPG</h1>
          <p>Deck-building Spelling Challenge Roguelike</p>
        </div>
        
        {!isMobile ? (
          <div className="window-controls">
            <button 
              className={`control-btn ${windows.map.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('map')}
            >
              🗺️ MAP & BATTLE
            </button>
            <button 
              className={`control-btn ${windows.status.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('status')}
            >
              📊 STATUS
            </button>
            <button 
              className={`control-btn ${windows.logs.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('logs')}
            >
              📜 LOGS
            </button>
            <button 
              className={`control-btn ${windows.legend.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('legend')}
            >
              🔑 LEGEND
            </button>
            <button 
              className={`control-btn ${windows.wordlist.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('wordlist')}
            >
              📖 DECK & WORDS ({Object.keys(learnedWords).length})
            </button>
            <button 
              className={`control-btn ${windows.settings?.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('settings')}
            >
              ⚙️ SETTINGS
            </button>
            <button 
              className="control-btn reset-layout-btn"
              onClick={resetWindows}
            >
              🔄 RESET
            </button>
          </div>
        ) : (
          <div className="panel-tabs">
            <button 
              type="button"
              className={`panel-tab-btn ${rightTab === 'status' ? 'active' : ''}`}
              onClick={() => setRightTab('status')}
            >
              📊 プレイ画面
            </button>
            <button 
              type="button"
              className={`panel-tab-btn ${rightTab === 'wordlist' ? 'active' : ''}`}
              onClick={() => setRightTab('wordlist')}
            >
              📖 デッキ & 単語 ({Object.keys(learnedWords).length})
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {isMobile ? (
          <div className="mobile-layout-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
            {renderMobileContent()}
          </div>
        ) : (
          <div className="desktop-area">
            {renderWindow('map', 'Dungeon Arena', renderMapContent())}
            {renderWindow('status', 'Player Status', renderStatusContent())}
            {renderWindow('logs', 'Action Logs', renderLogsContent())}
            {renderWindow('legend', 'Legend & Key', renderLegendContent())}
            {renderWindow('wordlist', 'Deck & Learning Settings', renderWordListContent())}
            {windows.settings && renderWindow('settings', 'System & Stats', renderSettingsContent())}
          </div>
        )}
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
            <span>ダンジョンからの脱出に成功しました！</span>
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
