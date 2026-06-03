/* eslint-disable react-hooks/exhaustive-deps, react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/immutability, no-unused-vars, no-empty, no-useless-assignment */
import { useState, useEffect, useRef } from 'react';
import TileMap from './components/TileMap';
import QuizOverlay from './components/QuizOverlay';
import WordListPanel from './components/WordListPanel';
import { getRandomQuestion, setDefaultQuestions, getCustomQuestions, QUESTIONS_DB } from './utils/questions';
import { generateFloorStory, generateGameStateComment, generateQuizHint } from './utils/gemini';
import Papa from 'papaparse';
import { exportStatsToCSV } from './utils/stats';
import { syncAllToCloud, syncAllFromCloud } from './utils/sync';
import {
  generateStarterDeck,
  getRandomRewardCards,
  createCardInstance,
  CARDS_DB
} from './utils/cards';
import { RELICS_DB, getRandomRelic } from './utils/relics';
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

// Procedural Dungeon Generator
const generateDungeon = (floor) => {
  const COLS = Math.min(100, 30 + (floor - 1) * 10);
  const ROWS = Math.min(100, 30 + (floor - 1) * 10);
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
  const targetRooms = Math.min(15, Math.max(4, Math.floor((COLS * ROWS) / 250))); // Minimum 4 rooms, max 15

  // 2. Generate random rooms
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 300) {
    attempts++;
    // Dynamic max size for some larger rooms
    const currentMaxSize = Math.random() < 0.2 ? 12 : 8;
    const w = Math.floor(Math.random() * (currentMaxSize - minSize + 1)) + minSize;
    const h = Math.floor(Math.random() * (currentMaxSize - minSize + 1)) + minSize;
    const x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
    const y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;

    // Check overlap with padding of 1
    let overlap = false;
    for (const r of rooms) {
      if (x - 1 <= r.x + r.w && x + w + 1 >= r.x && y - 1 <= r.y + r.h && y + h + 1 >= r.y) {
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
    { subType: 'slime', char: 's', name: 'スライム', hp: 5, atk: 5, def: 0, xp: 4, gold: 3 },
    { subType: 'bat', char: 'b', name: 'コウモリ', hp: 6, atk: 6, def: 0, xp: 5, gold: 4 },
    { subType: 'skeleton', char: 'S', name: 'スケルトン', hp: 14, atk: 9, def: 2, xp: 12, gold: 8 },
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
  const commonItemTypes = [
    { subType: 'potion', char: 'P', name: 'ポーション' },
    { subType: 'chest', char: 'C', name: '宝箱' },
    { subType: 'shop', char: '$', name: '商人' },
    { subType: 'golden_apple', char: 'A', name: 'おうごんのリンゴ' },
    { subType: 'magic_book', char: 'M', name: 'まほうの書' }
  ];

  const rareItemTypes = [
    { subType: 'energy_crystal', char: 'E', name: 'エネルギークリスタル' },
    { subType: 'magic_bag', char: 'B', name: 'まほうのふくろ' }
  ];

  const equipmentTypes = [
    { subType: 'sword', char: 'W', name: '鉄の剣' },
    { subType: 'shield', char: 'D', name: '鉄の盾' }
  ];

  let entityIdCounter = 0;

  // Fill rooms with entities
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];

    // Spawn Enemies in the room (increased spawn rate)
    const enemiesToSpawn = Math.floor(Math.random() * 2) + 2; // 2 to 3 enemies per room
    for (let e = 0; e < enemiesToSpawn; e++) {
      const enemyX = Math.floor(room.x + Math.random() * room.w);
      const enemyY = Math.floor(room.y + Math.random() * room.h);
      
      if (!(enemyX === lastRoom.cx && enemyY === lastRoom.cy) && !enemies.some(en => en.x === enemyX && en.y === enemyY)) {
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
    }

    // Spawn Item in the room
    const itemX = Math.floor(room.x + Math.random() * room.w);
    const itemY = Math.floor(room.y + Math.random() * room.h);
    
    if (!(itemX === lastRoom.cx && itemY === lastRoom.cy) && !(itemX === startPos.x && itemY === startPos.y)) {
      let selectedItem;
      if (Math.random() < 0.05) {
        selectedItem = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
      } else {
        if (floor >= 3 && Math.random() < 0.08) {
          selectedItem = rareItemTypes[Math.floor(Math.random() * rareItemTypes.length)];
        } else {
          selectedItem = commonItemTypes[Math.floor(Math.random() * commonItemTypes.length)];
        }
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
  maxEnergy: 3,
  maxDraw: 3,
  deck: [],
  relics: []
};

// Enemy Intention generator
const rollEnemyIntent = (enemy, turnNumber) => {
  const seed = Math.random();
  const subType = enemy.subType;
  const atk = enemy.atk;
  
  if (subType === 'slime') {
    if (seed < 0.5) {
      return { type: 'attack', damage: atk, weak: 1, name: 'ねばねばタックル', text: `こうげき (${atk}ダメージ + じゃくたいか)` };
    } else {
      return { type: 'defend', block: 4, name: 'からをふくらます', text: `ぼうぎょ (4ブロック)` };
    }
  } else if (subType === 'bat') {
    if (seed < 0.5) {
      return { type: 'attack', damage: Math.max(2, atk - 1), vulnerable: 1, name: 'きゅうこうか', text: `こうげき (${Math.max(2, atk - 1)}ダメージ + ゼイジャク)` };
    } else {
      return { type: 'attack', damage: atk, lifesteal: true, name: 'かみつき', text: `きゅうけつ (${atk}ダメージ)` };
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
    if (turnNumber % 3 === 2) {
      return { type: 'debuff', weak: 1, name: 'のろい', text: `デバフ (じゃくたいか 1ターン)` };
    } else if (seed < 0.5) {
      return { type: 'defend', block: 8, name: 'おんりょうのたて', text: `ぼうぎょ (8ブロック)` };
    } else {
      return { type: 'attack', damage: Math.max(1, atk - 2), vulnerable: 1, name: 'ポルターガイスト', text: `こうげき (${Math.max(1, atk-2)}ダメージ + ゼイジャク)` };
    }
  } else if (subType === 'werewolf') {
    if (turnNumber % 2 === 0) {
      return { type: 'attack', damage: Math.floor(atk/2)+1, multi: 3, name: 'れんぞくひっかき', text: `れんぞくこうげき (${Math.floor(atk/2)+1}x3ダメージ)` };
    } else if (seed < 0.3) {
      return { type: 'defend', block: 5, strength: 1, name: 'とおぼえ', text: `ぼうぎょ＆チャージ (5ブロック + すじりょく1)` };
    } else {
      return { type: 'attack', damage: atk, name: 'かみつき', text: `こうげき (${atk}ダメージ)` };
    }
  } else if (subType === 'vampire') {
    if (seed < 0.4) {
      return { type: 'attack', damage: atk + 5, lifesteal: true, name: 'きゅうけつ', text: `きゅうけつこうげき (${atk + 5}ダメージ)` };
    } else if (seed < 0.7) {
      return { type: 'buff', strength: 2, name: 'ちをすする', text: `チャージ (すじりょく+2)` };
    } else {
      return { type: 'attack', damage: Math.floor(atk/2), multi: 2, vulnerable: 1, name: 'やみのはどう', text: `れんぞくこうげき (${Math.floor(atk/2)}x2ダメージ + ゼイジャク)` };
    }
  } else if (subType === 'demon') {
    if (turnNumber % 3 === 0) {
      return { type: 'attack', damage: atk + 10, name: 'じごくのほのお', text: `ぜんたいこうげき (${atk + 10}ダメージ)` };
    } else if (turnNumber % 3 === 1) {
      return { type: 'attack', damage: Math.max(1, atk - 5), weak: 2, name: 'あくむのいちげき', text: `こうげき (${Math.max(1, atk-5)}ダメージ + じゃくたいか 2ターン)` };
    } else {
      return { type: 'defend', block: 15, name: 'まほうのバリア', text: `ぼうぎょ (15ブロック)` };
    }
  } else if (subType === 'dragon') {
    if (turnNumber % 4 === 0) {
      return { type: 'attack', damage: atk + 20, vulnerable: 2, name: 'ドラゴンブレス', text: `ひっさつこうげき (${atk + 20}ダメージ + ゼイジャク 2ターン)` };
    } else if (turnNumber % 4 === 3) {
      return { type: 'buff', strength: 5, name: 'いきをすいこむ', text: `チャージ (すじりょく+5)` };
    } else if (seed < 0.4) {
      return { type: 'defend', block: 20, name: 'はがねのうろこ', text: `ぼうぎょ (20ブロック)` };
    } else {
      return { type: 'attack', damage: Math.floor(atk/2)+2, multi: 2, name: 'かみくだき', text: `れんぞくこうげき (${Math.floor(atk/2)+2}x2ダメージ)` };
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
  const [syncToken, setSyncToken] = useState(localStorage.getItem('learning_rpg_sync_token') || '');

  // Card deck-building RPG States
  const [battle, setBattle] = useState(null);
  const [campsite, setCampsite] = useState(null);
  const [cardReward, setCardReward] = useState(null);
  const [shop, setShop] = useState(null);

  // Quiz and Word Learning States
  const [customWords, setCustomWords] = useState([]);
  const [learnedWords, setLearnedWords] = useState({});
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [floorStory, setFloorStory] = useState(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [rightTab, setRightTab] = useState('status'); // 'status' or 'wordlist'
  
  const roomDescriptionsRef = useRef([]);
  const visitedRoomsRef = useRef(new Set());
  const mapMessageTimerRef = useRef(null);
  const lastMoveTimeRef = useRef(0);
  const [mapMessage, setMapMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');

  const saveApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKeyInput);
    setShowSettings(false);
    addLog('設定を保存しました。', 'system');
  };
  const [aiComment, setAiComment] = useState(null);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [enemyActionText, setEnemyActionText] = useState("");
  const [screenShake, setScreenShake] = useState(false);
  const [battleFocusIndex, setBattleFocusIndex] = useState(0);
  const [cardRewardFocusIndex, setCardRewardFocusIndex] = useState(0);
  const [campsiteActionFocusIndex, setCampsiteActionFocusIndex] = useState(0);
  const [campsiteCardFocusIndex, setCampsiteCardFocusIndex] = useState(0);
  const [shopFocusIndex, setShopFocusIndex] = useState(0);
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
  }, []);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'default_questions.csv?v=' + Date.now())
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch default questions');
        return res.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0 || !results.data[0].question) {
              console.error('Invalid CSV data');
              return;
            }
            const formatted = results.data.map(row => ({
              id: parseInt(row.id) || Date.now(),
              category: row.category,
              type: row.type || 'choice',
              question: row.question,
              answer: row.answer,
              choices: row.type === 'choice' ? [row.answer, row.dummy1, row.dummy2, row.dummy3].filter(Boolean) : undefined,
              explanation: row.explanation || row['解説'] || row.解説 || '',
            }));
            setDefaultQuestions(formatted);
          }
        });
      })
      .catch(e => console.error(e));
  }, []);

  const logEndRef = useRef(null);
  const chattersPoolRef = useRef([]);
  const chatterIndexRef = useRef(0);
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
    if (battle.playerEnergy < card.cost) {
      addLog("エナジーが足りない！", 'system');
      return;
    }
    
    // エナジーを即座に消費
    setBattle(prev => ({ ...prev, playerEnergy: prev.playerEnergy - card.cost }));

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
    if (gameOver || gameVictory || activeQuiz || !battle || isEnemyTurn) return;
    
    const intent = battle.enemyIntent;
    let actionText = "敵のターン...";
    
    if (intent) {
      if (intent.damage !== undefined) {
        let multi = intent.multi || 1;
        let baseDmg = intent.damage + (battle.enemyStatus.strength || 0);
        if (battle.playerStatus.vulnerable > 0) baseDmg = Math.floor(baseDmg * 1.5);
        
        let totalDmg = baseDmg * multi;
        let playerBlock = battle.playerBlock;
        let finalDmg = Math.max(0, totalDmg - playerBlock);

        let attackStr = intent.multi ? `${baseDmg}x${multi} ダメージ` : `${baseDmg} ダメージ`;

        if (finalDmg === 0) {
          actionText = `${battle.enemy.name} の「${intent.name}」！\n${attackStr} ${isStealthMode ? '' : '🛡️'}完全にブロックした！`;
        } else if (playerBlock > 0) {
          actionText = `${battle.enemy.name} の「${intent.name}」！\n${attackStr} (ブロック -${playerBlock} ＝ ${finalDmg}被ダメージ)`;
        } else {
          actionText = `${battle.enemy.name} の「${intent.name}」！\n${attackStr}を受けた！`;
        }

        if (intent.block) {
          actionText += `\n＆ ${intent.block} ブロック！`;
        }
      } else if (intent.block) {
        actionText = `${battle.enemy.name} の「${intent.name}」！\n${intent.block} ブロック！`;
      } else if (intent.type === 'debuff') {
        actionText = `${battle.enemy.name} の「${intent.name}」！\n弱体化を受けた！`;
      } else if (intent.type === 'buff') {
         actionText = `${battle.enemy.name} の「${intent.name}」！\n敵が強化された！`;
      } else {
        actionText = `${battle.enemy.name} は様子を見ている...`;
      }
    }
    setEnemyActionText(actionText);
    setIsEnemyTurn(true);
  };

  useEffect(() => {
    if (isEnemyTurn && battle) {
      const timer = setTimeout(() => {
        resolveEnemyTurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isEnemyTurn, battle]);

  const handleEnemyDefeat = (defeatedEnemy, currentPlayer) => {
    addLog(`${defeatedEnemy.name} を倒した！`, 'level-up');
    playVictorySound();
    
    const xpReward = defeatedEnemy.xp;
    const goldReward = defeatedEnemy.gold;
    currentPlayer.xp += xpReward;
    currentPlayer.gold += goldReward;

    if (currentPlayer.xp >= currentPlayer.xpNeeded) {
      currentPlayer.level += 1;
      currentPlayer.xp -= currentPlayer.xpNeeded;
      currentPlayer.xpNeeded = Math.round(currentPlayer.xpNeeded * 1.5);
      currentPlayer.maxHp += 8;
      currentPlayer.hp = currentPlayer.maxHp;
      currentPlayer.atk += 2;
      currentPlayer.def += 1;
      addLog(`レベルアップ！ レベル ${currentPlayer.level} になった！ (HP最大値+8、HP全回復)`, 'level-up');
      playLevelUpSound();
    }

    const enemyX = defeatedEnemy.x;
    const enemyY = defeatedEnemy.y;
    const nextEnemies = enemies.filter(e => !(e.x === enemyX && e.y === enemyY));
    setEnemies(nextEnemies);

    setBattle(null);
    setPlayer(currentPlayer);
    
    let actualGold = goldReward;
    if (currentPlayer.relics && currentPlayer.relics.some(r => r.key === 'lucky_coin')) {
      actualGold = Math.floor(actualGold * 1.2);
    }
    
    if (currentPlayer.relics && currentPlayer.relics.some(r => r.key === 'vampire_tooth')) {
      currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + 3);
      addLog("レリック「きゅうけつきのキバ」の効果でHPが3回復した！", 'system');
    }

    setCardReward({
      choices: getRandomRewardCards(currentPlayer.floor),
      gold: actualGold,
      xp: xpReward
    });
  };

  const resolveEnemyTurn = () => {
    if (gameOver || gameVictory || activeQuiz || !battle) return;
    
    let nextBattle = { ...battle };
    let nextPlayer = { ...player };
    
    const intent = nextBattle.enemyIntent;
    if (intent) {
      addLog(`${nextBattle.enemy.name} のターン: 「${intent.name}」を使用！`, 'system');
      
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
            addLog(`プレイヤーは ${finalDmg} ダメージを受けた！`, 'damage-taken');
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
            
            if (intent.lifesteal) {
               let healAmount = Math.floor(finalDmg / 2);
               if (healAmount > 0) {
                 nextBattle.enemy.hp = Math.min(nextBattle.enemy.maxHp, nextBattle.enemy.hp + healAmount);
                 addLog(`${nextBattle.enemy.name} はHPを ${healAmount} 吸収した！`, 'system');
               }
            }
          } else {
            addLog("プレイヤーは攻撃を完全にブロックした！", 'system');
          }
        }
      }
      
      if (intent.block !== undefined) {
        nextBattle.enemyBlock += intent.block;
        addLog(`${nextBattle.enemy.name} は ${intent.block} のブロックを得た。`, 'system');
      }

      if (intent.strength) {
        nextBattle.enemyStatus.strength += intent.strength;
        addLog(`${nextBattle.enemy.name} のパワーが上がった！`, 'system');
      }
      if (intent.weak) {
        nextBattle.playerStatus.weak += intent.weak;
        addLog(`プレイヤーは「じゃくたいか」を受けた！`, 'system');
      }
      if (intent.vulnerable) {
        nextBattle.playerStatus.vulnerable += intent.vulnerable;
        addLog(`プレイヤーは「ゼイジャク」になった！`, 'system');
      }
    }
    
    // Poison damage for enemy at END of their turn? Actually usually poison happens at the start of their turn, but here is fine.
    if (nextBattle.enemyStatus.poison > 0) {
       const pDmg = nextBattle.enemyStatus.poison;
       nextBattle.enemy.hp = Math.max(0, nextBattle.enemy.hp - pDmg);
       addLog(`毒により ${nextBattle.enemy.name} に ${pDmg} ダメージ！`, 'system');
       nextBattle.enemyStatus.poison -= 1;
       if (nextBattle.enemy.hp <= 0) {
         handleEnemyDefeat(nextBattle.enemy, nextPlayer);
         setIsEnemyTurn(false);
         return;
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
    
    let drawCount = nextPlayer.maxDraw || 3;
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
  };

  const renderBattleContent = () => {
    if (!battle) return null;
    const { enemy, enemyBlock, enemyIntent, turn, playerEnergy, playerBlock, hand } = battle;

    const getEnemySprite = (subType) => {
      switch(subType) {
        case 'slime': return (isStealthMode ? 'Slime' : '🟢');
        case 'bat': return (isStealthMode ? 'Bat' : '🦇');
        case 'skeleton': return (isStealthMode ? 'Skeleton' : '💀');
        case 'ghost': return (isStealthMode ? 'Ghost' : '👻');
        default: return (isStealthMode ? 'Enemy' : '👾');
      }
    };

    const getIntentionIcon = (intent) => {
      if (!intent) return (isStealthMode ? '?' : '❓');
      switch(intent.type) {
        case 'attack': return intent.multi ? (isStealthMode ? 'Attack(x2)' : '⚔️⚔️') : (isStealthMode ? 'Attack' : '⚔️');
        case 'defend': return (isStealthMode ? 'Defend' : '🛡️');
        case 'debuff': return (isStealthMode ? 'Debuff' : '✨');
        default: return (isStealthMode ? 'Sleep' : '💤');
      }
    };

    return (
      <div className="battle-screen" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '6px', boxSizing: 'border-box', background: '#f3f4f6', border: '1px solid #ff3e3e', borderRadius: '8px', color: '#111827', gap: '6px' }}>
        
        {isEnemyTurn && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
             <h2 style={{ color: '#ff3e3e', textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff', fontSize: '1.8rem', animation: 'pulse 1s infinite', letterSpacing: '1px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
               {enemyActionText}
             </h2>
          </div>
        )}
        
        {/* Arena */}
        <div className="battle-arena" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, minHeight: '130px', padding: '4px', borderBottom: '1px dashed #d1d5db' }}>
          
          {/* Player */}
          <div className="battle-character player-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '2px' }}>{isStealthMode ? '' : '🛡️👤'}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.0rem', color: '#ff3e3e' }}>ゆうしゃ</div>
            
            <div style={{ width: '100%', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1px' }}>
                <span>HP: {player.hp} / {player.maxHp}</span>
                {playerBlock > 0 && <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{isStealthMode ? '' : '🛡️ '}{playerBlock}</span>}
              </div>
              <div style={{ height: '8px', background: '#d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#ef4444', width: `${(player.hp / player.maxHp) * 100}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>

          {/* Turn Marker */}
          <div style={{ fontSize: '0.8rem', color: '#4b5563', textAlign: 'center' }}>
            <div>ターン</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ff3e3e' }}>{turn}</div>
          </div>

          {/* Enemy */}
          <div className="battle-character enemy-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '2px' }}>{getEnemySprite(enemy.subType)}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.0rem', color: '#f87171' }}>{enemy.name}</div>
            
            <div style={{ width: '100%', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1px' }}>
                <span>HP: {enemy.hp} / {enemy.maxHp}</span>
                {enemyBlock > 0 && <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{isStealthMode ? '' : '🛡️ '}{enemyBlock}</span>}
              </div>
              <div style={{ height: '8px', background: '#d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#ef4444', width: `${(enemy.hp / enemy.maxHp) * 100}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>

            {enemyIntent && (
              <div style={{ marginTop: '4px', background: '#f3f4f6', border: '1px solid #44403c', borderRadius: '4px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }} title={enemyIntent.text}>
                <span>{getIntentionIcon(enemyIntent)}</span>
                <span style={{ color: '#d1d5db' }}>{enemyIntent.name}</span>
                <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                  {enemyIntent.damage !== undefined ? `${enemyIntent.damage}` : ''}
                  {enemyIntent.block !== undefined ? (`+${enemyIntent.block}${isStealthMode ? '' : '🛡️'}`) : ''}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Battle Logs / Feedback */}
        <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px 8px', height: '48px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontSize: '0.85rem', gap: '3px' }}>
          {logs.length > 0 ? logs.slice(-2).map((log, i) => (
            <div key={i} style={{ color: log.type === 'damage-taken' ? '#ef4444' : log.type === 'damage-dealt' ? '#60a5fa' : log.type === 'level-up' ? '#fbbf24' : '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: 'fadeIn 0.2s' }}>
              &gt; {log.text}
            </div>
          )) : (
            <div style={{ color: '#4b5563', textAlign: 'center' }}>カードをえらんで、クイズにこたえよう！</div>
          )}
        </div>

        {/* Card Hand and Turn controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingTop: '8px', paddingBottom: '2px', justifyContent: 'center' }}>
            {hand.map((card, idx) => {
              const borderCol = card.type === 'attack' ? '#ff3e3e' : card.type === 'skill' ? '#3b82f6' : '#eab308';
              const canPlay = playerEnergy >= card.cost;
              const isFocused = idx === Math.min(battleFocusIndex, hand.length);
              return (
                <button
                  key={card.id || idx}
                  onClick={() => canPlay ? handleCardClick(card) : null}
                  disabled={!canPlay}
                  style={{
                    flex: '0 0 92px',
                    height: '110px',
                    border: isFocused ? `3px solid #fbbf24` : `1px solid ${borderCol}`,
                    borderRadius: '4px',
                    background: '#f9fafb',
                    color: '#111827',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '5px',
                    textAlign: 'left',
                    transition: 'transform 0.15s',
                    position: 'relative',
                    opacity: canPlay ? 1 : 0.4,
                    boxShadow: isFocused ? `0 0 12px ${borderCol}, 0 0 0 2px #fbbf24` : (canPlay ? `0 0 6px ${borderCol}60` : 'none'),
                    transform: isFocused ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
                    cursor: canPlay ? 'pointer' : 'not-allowed',
                    outline: 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px', color: card.type === 'attack' ? '#dc2626' : '#0284c7' }}>
                        {card.name}
                      </span>
                    </div>
                    <span style={{ background: borderCol, color: '#000', fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', position: 'absolute', top: '-6px', right: '-6px', zIndex: 10, border: '1px solid #fff' }}>{card.cost}</span>
                    <div style={{ fontSize: '0.7rem', color: '#4b5563', lineHeight: '1.3', maxHeight: '65px', overflow: 'hidden', wordBreak: 'break-all' }}>
                      {card.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #d1d5db', paddingTop: '8px', paddingBottom: '4px' }}>
            <div style={{ background: '#1e3a8a', color: '#93c5fd', fontWeight: 'bold', fontSize: '1.2rem', padding: '6px 16px', borderRadius: '8px', border: '2px solid #3b82f6', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
              {isStealthMode ? 'Energy: ' : '⚡ '}{playerEnergy} / {battle.playerMaxEnergy || 3}
            </div>
            {(() => {
              const isEndTurnFocused = Math.min(battleFocusIndex, battle.hand.length) === battle.hand.length;
              return (
                <button
                  onClick={handleEndTurn}
                  style={{
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: '#111827',
                    border: isEndTurnFocused ? '3px solid #fbbf24' : 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    boxShadow: isEndTurnFocused ? '0 0 12px #ef4444' : 'none',
                    transform: isEndTurnFocused ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s',
                    outline: 'none',
                  }}
                >
                  ターン終了
                </button>
              );
            })()}
          </div>
        </div>

      </div>
    );
  };

  const handleCampsiteRest = () => {
    setPlayer(prev => ({ ...prev, hp: prev.maxHp }));
    addLog(`${isStealthMode ? '' : '🛌 '}やすむ をえらんだ。キャンプでゆっくりやすみ、HPが ぜんぶ かいふくした！`, 'system');
    playLevelUpSound();
    
    setTimeout(() => {
      loadNextFloor(campsite.nextFloorNum);
      setCampsite(null);
    }, 1200);
  };

  const handleCampsiteUpgrade = (card) => {
    const updatedDeck = player.deck.map(c => {
      if (c.id === card.id) {
        return createCardInstance(c.key, true);
      }
      return c;
    });

    setPlayer(prev => ({ ...prev, deck: updatedDeck }));
    addLog(`${isStealthMode ? '' : '🔨 '}きたえる をえらんだ。カード「${card.name}」を「${card.name}+」につよくした！`, 'level-up');
    playLevelUpSound();

    loadNextFloor(campsite.nextFloorNum);
    setCampsite(null);
  };

  const renderCampsiteContent = () => {
    if (!campsite) return null;
    const { showSmithDeck } = campsite;

    const actionFocused = Math.min(campsiteActionFocusIndex, 1);
    const cardFocused = Math.min(campsiteCardFocusIndex, player.deck.length);

    return (
      <div className="campsite-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '12px', boxSizing: 'border-box', background: '#f3f4f6', border: '1px solid #d97706', borderRadius: '8px', color: '#111827', gap: '12px' }}>
        {!showSmithDeck ? (
          <>
            <div style={{ fontSize: '2.5rem', animation: 'pulse 2s infinite' }}>{isStealthMode ? 'FIRE' : '🔥'}</div>
            <h2 style={{ color: '#f59e0b', margin: 0, fontSize: '1.1rem' }}>キャンプ（休憩場所）</h2>
            <p style={{ fontSize: '0.70rem', color: '#d1d5db', textAlign: 'center', maxWidth: '280px', lineHeight: '1.3' }}>
              つぎのフロアへすすむまえに、たきびのそばでゆっくりやすむか、カードを1枚つよくできます。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '200px', marginTop: '6px' }}>
              <button
                onClick={handleCampsiteRest}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'linear-gradient(to right, #0f766e, #0d9488)',
                  color: '#111827',
                  border: actionFocused === 0 ? '3px solid #fbbf24' : '1px solid #14b8a6',
                  boxShadow: actionFocused === 0 ? '0 0 12px #0f766e, 0 0 0 2px #fbbf24' : 'none',
                  transform: actionFocused === 0 ? 'scale(1.05)' : 'scale(1)',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}
              >
                <span>{isStealthMode ? '' : '🛌 '}やすむ</span>
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
                  color: '#111827',
                  border: actionFocused === 1 ? '3px solid #fbbf24' : '1px solid #f59e0b',
                  boxShadow: actionFocused === 1 ? '0 0 12px #b45309, 0 0 0 2px #fbbf24' : 'none',
                  transform: actionFocused === 1 ? 'scale(1.05)' : 'scale(1)',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}
              >
                <span>{isStealthMode ? '' : '🔨 '}きたえる</span>
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
                style={{ 
                  padding: '2px 6px', 
                  background: '#d1d5db', 
                  color: '#111827', 
                  border: cardFocused === player.deck.length ? '2px solid #fbbf24' : 'none',
                  boxShadow: cardFocused === player.deck.length ? '0 0 8px #9ca3af' : 'none',
                  transform: cardFocused === player.deck.length ? 'scale(1.05)' : 'scale(1)',
                  borderRadius: '4px', 
                  fontSize: '0.65rem', 
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}
              >
                もどる
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {player.deck.map((card, idx) => {
                  const canUpgrade = !card.upgraded;
                  const isFocused = cardFocused === idx;
                  return (
                    <button
                      key={card.id || idx}
                      disabled={!canUpgrade}
                      onClick={() => handleCampsiteUpgrade(card)}
                      style={{
                        padding: '4px',
                        background: '#ffffff',
                        border: isFocused ? '3px solid #fbbf24' : `1px solid ${card.upgraded ? '#9ca3af' : '#f59e0b'}`,
                        borderRadius: '4px',
                        color: card.upgraded ? '#9ca3af' : '#111827',
                        textAlign: 'left',
                        cursor: canUpgrade ? 'pointer' : 'default',
                        opacity: canUpgrade ? 1 : 0.6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                        boxShadow: isFocused ? '0 0 12px #f59e0b, 0 0 0 2px #fbbf24' : (canUpgrade ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'),
                        transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.15s',
                        outline: 'none'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: card.upgraded ? '#9ca3af' : '#d97706' }}>
                        {card.name}
                      </div>
                      <div style={{ fontSize: '0.58rem', lineHeight: '1.2', color: card.upgraded ? '#9ca3af' : '#4b5563' }}>
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

  const getCardPrice = (card) => {
    if (card.rarity === 'common') return 50;
    if (card.rarity === 'uncommon') return 75;
    if (card.rarity === 'rare') return 100;
    return 50;
  };

  const handleShopBuyCard = (card) => {
    const price = getCardPrice(card);
    if (player.gold >= price) {
      setPlayer(prev => ({ ...prev, gold: prev.gold - price, deck: [...prev.deck, card] }));
      setShop(prev => ({ ...prev, cards: prev.cards.filter(c => c.id !== card.id) }));
      addLog(`🪙 ${price}G支払い、「${card.name}」を購入した。`, 'system');
    } else {
      addLog(`ゴールドが足りない！`, 'system');
    }
  };

  const handleShopBuyItem = (itemData) => {
    if (player.gold >= itemData.cost) {
      setPlayer(prev => {
        let np = { ...prev, gold: prev.gold - itemData.cost };
        if (itemData.key === 'potion') { np.hp = Math.min(np.maxHp, np.hp + 25); }
        else if (itemData.key === 'golden_apple') { np.maxHp += 10; np.hp += 10; }
        else if (itemData.key === 'energy_crystal') { np.maxEnergy = (np.maxEnergy || 3) + 1; }
        else if (itemData.key === 'magic_bag') { np.maxDraw = (np.maxDraw || 3) + 1; }
        return np;
      });
      setShop(prev => ({ ...prev, items: prev.items.filter(i => i.key !== itemData.key) }));
      addLog(`🪙 ${itemData.cost}G支払い、「${itemData.name}」を購入した。`, 'system');
    } else { addLog(`ゴールドが足りない！`, 'system'); }
  };

  const handleShopBuyWeapon = (weapon) => {
    if (player.gold >= weapon.cost) {
      setPlayer(prev => {
        const np = { ...prev, gold: prev.gold - weapon.cost };
        if (weapon.key === 'sword') {
          np.swordLevel = (np.swordLevel || (np.swordEquipped ? 2 : 0)) + 1;
          np.swordEquipped = true;
        } else {
          np.shieldLevel = (np.shieldLevel || (np.shieldEquipped ? 2 : 0)) + 1;
          np.shieldEquipped = true;
        }
        return np;
      });
      setShop(prev => ({ ...prev, weapons: prev.weapons.filter(w => w.key !== weapon.key) }));
      addLog(`🪙 ${weapon.cost}G支払い、「${weapon.name}」を購入した。`, 'system');
    } else { addLog(`ゴールドが足りない！`, 'system'); }
  };

  const handleShopHeal = () => {
    if (player.hp >= player.maxHp) {
      addLog(`HPはすでに満タンだ。`, 'system');
    } else if (player.gold >= 30) {
      setPlayer(prev => ({ ...prev, gold: prev.gold - 30, hp: Math.min(prev.maxHp, prev.hp + 30) }));
      addLog(`🪙 30G支払い、HPを30回復した。`, 'system');
    } else { addLog(`ゴールドが足りない！`, 'system'); }
  };

  const handleShopRemoveCardSelect = (cardIndex) => {
    if (!shop) return;
    const { removeCost } = shop;
    if (player.gold >= removeCost) {
      setPlayer(prev => {
        const newDeck = [...prev.deck];
        const removed = newDeck.splice(cardIndex, 1)[0];
        addLog(`🪙 ${removeCost}G支払い、「${removed.name}」を削除した。`, 'system');
        return { ...prev, gold: prev.gold - removeCost, deck: newDeck, removedCount: (prev.removedCount || 0) + 1 };
      });
      setShop(prev => ({ ...prev, removeCost: prev.removeCost + 25, removeMode: false }));
      setShopFocusIndex(0);
    } else {
      addLog(`ゴールドが足りない！`, 'system');
      setShop(prev => ({ ...prev, removeMode: false }));
      setShopFocusIndex(0);
    }
  };

  const handleShopLeave = () => {
    addLog("ショップをあとにした。", 'system');
    setShop(null);
  };

  const renderShopContent = () => {
    if (!shop) return null;
    const { cards, items, weapons, removeCost, removeMode } = shop;

    if (removeMode) {
      const cancelFocused = Math.min(shopFocusIndex, player.deck.length) === player.deck.length;
      return (
        <div className="shop-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box', background: '#f3f4f6', border: '1px solid #eab308', borderRadius: '8px', color: '#111827' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#dc2626' }}>削除するカードを選んでください ({removeCost}G)</span>
            <button 
              onClick={() => { setShop(prev => ({ ...prev, removeMode: false })); setShopFocusIndex(0); }} 
              style={{ 
                padding: '2px 6px', 
                fontSize: '0.7rem',
                border: cancelFocused ? '2px solid #fbbf24' : '1px solid #9ca3af',
                boxShadow: cancelFocused ? '0 0 8px #9ca3af' : 'none',
                transform: cancelFocused ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.1s',
                outline: 'none'
              }}
            >キャンセル</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {player.deck.map((card, idx) => {
                const isFocused = Math.min(shopFocusIndex, player.deck.length) === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleShopRemoveCardSelect(idx)}
                    style={{ 
                      padding: '4px', 
                      background: '#fee2e2', 
                      border: isFocused ? '3px solid #fbbf24' : '1px solid #ef4444', 
                      borderRadius: '4px', 
                      textAlign: 'left', 
                      cursor: 'pointer',
                      boxShadow: isFocused ? '0 0 12px #ef4444, 0 0 0 2px #fbbf24' : 'none',
                      transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.15s',
                      outline: 'none'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: '#b91c1c' }}>{card.name}</div>
                    <div style={{ fontSize: '0.6rem' }}>{card.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    let renderIdx = 0;

    return (
      <div className="shop-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box', background: '#f3f4f6', border: '1px solid #eab308', borderRadius: '8px', color: '#111827', gap: '8px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#d97706', margin: 0, fontSize: '1rem' }}>商人</h2>
          <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>所持金: {player.gold} G</div>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
          {cards.map((card, idx) => {
            const price = getCardPrice(card);
            const canAfford = player.gold >= price;
            const isFocused = renderIdx++ === Math.min(shopFocusIndex, renderIdx + (shop.cards ? shop.cards.length : 0) + (shop.items ? shop.items.length : 0) + (shop.weapons ? shop.weapons.length : 0) + 3);
            return (
              <button 
                key={idx} 
                onClick={() => handleShopBuyCard(card)} 
                style={{ 
                  flex: '0 1 100px', 
                  border: isFocused ? '3px solid #fbbf24' : `1px solid #eab308`, 
                  borderRadius: '4px', 
                  background: canAfford ? '#ffffff' : '#f3f4f6', 
                  padding: '5px', 
                  cursor: canAfford ? 'pointer' : 'not-allowed', 
                  textAlign: 'left', 
                  opacity: canAfford ? 1 : 0.6,
                  boxShadow: isFocused ? '0 0 12px #eab308, 0 0 0 2px #fbbf24' : 'none',
                  transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.62rem' }}>{card.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#f59e0b', textAlign: 'center', marginTop: '4px' }}>{price} G</div>
              </button>
            );
          })}
        </div>

        <div style={{ borderTop: '1px dashed #d1d5db', margin: '4px 0' }}></div>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '2px' }}>その他のサービス</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {items && items.map((item, idx) => {
            const isFocused = renderIdx++ === shopFocusIndex;
            return (
              <button 
                key={`i${idx}`} 
                onClick={() => handleShopBuyItem(item)} 
                disabled={player.gold < item.cost} 
                style={{ 
                  padding: '6px', background: '#fff', 
                  border: isFocused ? '3px solid #fbbf24' : '1px solid #3b82f6', 
                  borderRadius: '4px', fontSize: '0.7rem', opacity: player.gold >= item.cost ? 1 : 0.6,
                  boxShadow: isFocused ? '0 0 12px #3b82f6, 0 0 0 2px #fbbf24' : 'none',
                  transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}>
                {item.name} <br/><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{item.cost} G</span>
              </button>
            );
          })}
          {weapons && weapons.map((w, idx) => {
            const isFocused = renderIdx++ === shopFocusIndex;
            return (
              <button 
                key={`w${idx}`} 
                onClick={() => handleShopBuyWeapon(w)} 
                disabled={player.gold < w.cost} 
                style={{ 
                  padding: '6px', background: '#fff', 
                  border: isFocused ? '3px solid #fbbf24' : '1px solid #8b5cf6', 
                  borderRadius: '4px', fontSize: '0.7rem', opacity: player.gold >= w.cost ? 1 : 0.6,
                  boxShadow: isFocused ? '0 0 12px #8b5cf6, 0 0 0 2px #fbbf24' : 'none',
                  transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}>
                {w.name} <br/><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{w.cost} G</span>
              </button>
            );
          })}
          
          {(() => {
            const isFocused = renderIdx++ === shopFocusIndex;
            return (
              <button onClick={handleShopHeal} disabled={player.gold < 30} style={{ padding: '6px', background: '#fff', border: isFocused ? '3px solid #fbbf24' : '1px solid #10b981', borderRadius: '4px', fontSize: '0.7rem', opacity: player.gold >= 30 ? 1 : 0.6, boxShadow: isFocused ? '0 0 12px #10b981, 0 0 0 2px #fbbf24' : 'none', transform: isFocused ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.15s', outline: 'none' }}>
                HP30 回復 <br/><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>30 G</span>
              </button>
            );
          })()}

          {(() => {
            const isFocused = renderIdx++ === shopFocusIndex;
            return (
              <button onClick={() => { setShop(prev => ({ ...prev, removeMode: true })); setShopFocusIndex(0); }} disabled={player.gold < removeCost || player.deck.length <= 1} style={{ padding: '6px', background: '#fff', border: isFocused ? '3px solid #fbbf24' : '1px solid #ef4444', borderRadius: '4px', fontSize: '0.7rem', opacity: player.gold >= removeCost ? 1 : 0.6, boxShadow: isFocused ? '0 0 12px #ef4444, 0 0 0 2px #fbbf24' : 'none', transform: isFocused ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.15s', outline: 'none' }}>
                カード削除 <br/><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{removeCost} G</span>
              </button>
            );
          })()}
        </div>

        {(() => {
          const isFocused = renderIdx++ === shopFocusIndex;
          return (
            <button onClick={handleShopLeave} style={{ marginTop: 'auto', padding: '8px 10px', background: '#d1d5db', color: '#111827', border: isFocused ? '3px solid #fbbf24' : 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'center', boxShadow: isFocused ? '0 0 12px #9ca3af' : 'none', transform: isFocused ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.15s', outline: 'none' }}>
              店を出る
            </button>
          );
        })()}
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
      addLog(`${isStealthMode ? '' : '🎁 '}デッキに「${card.name}」を追加した。`, 'system');
      setCardReward(null);
    setShop(null);
    };

    const handleSkip = () => {
      addLog((isStealthMode ? 'カード報酬をスキップした。' : '🎁 カード報酬をスキップした。'), 'system');
      setCardReward(null);
    };

    return (
      <div className="reward-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '10px', boxSizing: 'border-box', background: '#f3f4f6', border: '1px solid #10b981', borderRadius: '8px', color: '#111827', gap: '8px' }}>
        <h2 style={{ color: '#10b981', margin: 0, fontSize: '1rem' }}>戦闘勝利！獲得報酬</h2>
        
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', background: '#ffffff', padding: '4px 8px', borderRadius: '4px' }}>
          <span style={{ color: '#fbbf24' }}>🪙 +{gold} G</span>
          <span style={{ color: '#60a5fa' }}>{isStealthMode ? '' : '✨ '}+{xp} XP</span>
        </div>

        <div style={{ fontSize: '0.65rem', color: '#4b5563' }}>
          デッキに加えるカードを選んでください：
        </div>

        <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}>
          {choices.map((card, idx) => {
            const borderCol = card.type === 'attack' ? '#ff3e3e' : card.type === 'skill' ? '#3b82f6' : '#eab308';
            const isFocused = idx === Math.min(cardRewardFocusIndex, choices.length);
            return (
              <button
                key={card.id || idx}
                onClick={() => handleSelectCard(card)}
                style={{
                  flex: '0 1 100px',
                  height: '120px',
                  border: isFocused ? '3px solid #fbbf24' : `1px solid ${borderCol}`,
                  borderRadius: '4px',
                  background: '#ffffff',
                  color: '#111827',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isFocused ? `0 0 12px ${borderCol}, 0 0 0 2px #fbbf24` : `0 3px 5px rgba(0, 0, 0, 0.3)`,
                  transform: isFocused ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.62rem', color: card.type === 'attack' ? '#dc2626' : card.type === 'skill' ? '#0284c7' : '#d97706', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px' }}>
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
                  <div style={{ fontSize: '0.55rem', color: '#4b5563', lineHeight: '1.2', maxHeight: '65px', overflow: 'hidden' }}>
                    {card.desc}
                  </div>
                </div>
                <div style={{ fontSize: '0.5rem', color: '#4b5563' }}>
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
            background: '#d1d5db',
            color: '#111827',
            border: cardRewardFocusIndex === choices.length ? '3px solid #fbbf24' : 'none',
            borderRadius: '4px',
            fontSize: '0.65rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: cardRewardFocusIndex === choices.length ? '0 0 12px #9ca3af' : 'none',
            transform: cardRewardFocusIndex === choices.length ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.15s',
            outline: 'none'
          }}
        >
          スキップ
        </button>
      </div>
    );
  };

  const renderExplorationMapContent = () => (
    <div className="map-panel-body" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', minHeight: '32px' }}>
        <div style={{ flex: 1 }}>
          {mapMessage && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #0284c7',
              color: '#111827',
              padding: '6px 12px',
              borderRadius: '8px',
              textAlign: 'left',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              fontStyle: 'italic',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              「{mapMessage}」
            </div>
          )}
        </div>
        <button 
          type="button" 
          className="layout-ctrl-btn" 
          onClick={() => setShowDpad(prev => !prev)} 
          style={{ color: showDpad ? '#059669' : '#888', marginLeft: '8px', whiteSpace: 'nowrap', marginTop: '2px' }}
          title="コントローラーの表示/非表示"
        >
          {showDpad ? '🎮 パッド非表示' : '🎮 パッド表示'}
        </button>
      </div>
      <div className="map-container-wrapper" style={{ position: 'relative' }}>
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
          <div className="keyboard-hint" style={{ fontSize: '0.72rem', color: '#4b5563', textAlign: 'center', padding: '0.5rem', border: '1px dashed #d1d5db', borderRadius: '8px', lineHeight: '1.3' }}>
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
            enemyName={battle ? battle.enemy.name : '謎の敵'}
          />
        </div>
      );
    }
    if (campsite) {
      return renderCampsiteContent();
    }
    if (shop) {
      return renderShopContent();
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
        <div className={`inventory-slot ${player.swordLevel || player.swordEquipped ? 'equipped' : ''}`}>
          <span className="equip-icon">{player.swordLevel || player.swordEquipped ? (isStealthMode ? 'Swd' : '🗡️') : (isStealthMode ? '-' : '➖')}</span>
          <span>{player.swordLevel || player.swordEquipped ? `剣 Lv.${player.swordLevel || (player.swordEquipped ? 2 : 0)} (開始時 筋力+${player.swordLevel || 2})` : '遺物スロット'}</span>
        </div>
        <div className={`inventory-slot ${player.shieldLevel || player.shieldEquipped ? 'equipped' : ''}`}>
          <span className="equip-icon">{player.shieldLevel || player.shieldEquipped ? (isStealthMode ? 'Defend' : '🛡️') : (isStealthMode ? '-' : '➖')}</span>
          <span>{player.shieldLevel || player.shieldEquipped ? `盾 Lv.${player.shieldLevel || (player.shieldEquipped ? 2 : 0)} (開始時 ブロック+${(player.shieldLevel || 2) * 2})` : '遺物スロット'}</span>
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
        console.error(err);
        alert('セーブデータの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const customQuestions = [];
          const data = results.data;
          
          let startIndex = 0;
          if (data.length > 0 && data[0].length > 0 && String(data[0][0]).toLowerCase().includes('id')) {
            startIndex = 1;
          }
          
          for (let i = startIndex; i < data.length; i++) {
            const parts = data[i];
            if (parts.length < 5) continue;
            
            const type = parts[2] ? parts[2].trim() : 'choice';
            const qObj = {
              id: parseInt(parts[0]) || (1000 + i),
              category: parts[1] ? parts[1].trim() : '',
              type: type,
              question: parts[3] ? parts[3].trim() : '',
              answer: parts[4] ? parts[4].trim() : '',
            };
            
            if (type === 'choice' && parts.length >= 8) {
              qObj.choices = [
                parts[4] ? parts[4].trim() : '', 
                parts[5] ? parts[5].trim() : '', 
                parts[6] ? parts[6].trim() : '', 
                parts[7] ? parts[7].trim() : ''
              ].filter(Boolean);
            } else if (type === 'choice') {
              qObj.choices = [qObj.answer];
            }
            if (parts.length > 8 && parts[8]) {
              qObj.explanation = parts[8].trim();
            }
            
            customQuestions.push(qObj);
          }
          
          // 余計なことはせず、既存のリストを完全に上書きして切り替える
          localStorage.setItem('learning_rpg_custom_questions', JSON.stringify(customQuestions));
          
          alert(`CSVから問題を ${customQuestions.length} 問ロードしました！\n画面を再読み込みして問題を切り替えます。`);
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('CSVの読み込みに失敗しました。');
        }
      }
    });
  };

  const renderSettingsContent = () => {
    let stats = {};
    try {
      const parsed = JSON.parse(localStorage.getItem('learning_rpg_stats') || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        stats = parsed;
      }
    } catch (err) { console.error(err); }
    
    return (
      <div className="retro-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', overflowY: 'auto', background: '#f3f4f6', color: '#111827' }}>
        <h3 style={{ margin: 0, color: '#facc15' }}>{isStealthMode ? '' : '💾 '}セーブ＆ロード</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportSave} style={{ flex: 1, padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isStealthMode ? '' : '📥 '}セーブ書き出し
          </button>
          <label style={{ flex: 1, padding: '8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }}>
            {isStealthMode ? '' : '📤 '}セーブ読み込み
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportSave} />
          </label>
        </div>

        <h3 style={{ margin: '10px 0 0', color: '#14b8a6' }}>{isStealthMode ? '' : '☁️ '}クラウド同期 (GitHub)</h3>
        <p style={{ fontSize: '0.75rem', color: '#4b5563', margin: '0 0 5px' }}>
          GitHubのTokenを入力して、PCとiPadのデータを同期します。
        </p>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input 
            type="password" 
            value={syncToken} 
            onChange={(e) => setSyncToken(e.target.value)} 
            placeholder="ghp_..." 
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
          />
          <button 
            onClick={async () => {
              if (!syncToken) return alert('Tokenを入力してください');
              localStorage.setItem('learning_rpg_sync_token', syncToken);
              alert('クラウドから読み込んでいます...');
              const success = await syncAllFromCloud(syncToken);
              if (success) {
                alert('同期成功！画面を再読み込みします。');
                window.location.reload();
              } else {
                alert('クラウドにデータが見つかりませんでした。初めての方は「保存」を押してデータを作成してください。');
              }
            }}
            style={{ padding: '8px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isStealthMode ? '' : '☁️ '}読込
          </button>
          <button 
            onClick={async () => {
              if (!syncToken) return alert('Tokenを入力してください');
              localStorage.setItem('learning_rpg_sync_token', syncToken);
              alert('クラウドに保存しています...');
              const success = await syncAllToCloud();
              if (success) alert('クラウドへの保存が完了しました！');
              else alert('保存に失敗しました。');
            }}
            style={{ padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isStealthMode ? '' : '☁️ '}保存
          </button>
        </div>
        
        <h3 style={{ margin: '10px 0 0', color: '#a78bfa' }}>{isStealthMode ? '' : '📝 '}カスタム問題の追加 (CSV)</h3>
        <p style={{ fontSize: '0.75rem', color: '#4b5563', margin: '0 0 5px' }}>
          フォーマット: ID, カテゴリ, type(choice/input), 問題文, 正解, ダミー1, ダミー2, ダミー3
        </p>
        <label style={{ padding: '8px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }}>
          {isStealthMode ? '' : '📄 '}CSVファイルを読み込む
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
        </label>
        
        <button 
          onClick={async () => {
            if (window.confirm('学習記録と問題集のデータをすべてリセットし、初期状態に戻しますか？（クラウド同期中ならクラウドのデータもリセットされます）')) {
              localStorage.removeItem('learning_rpg_custom_questions');
              localStorage.removeItem('learning_rpg_stats');
              
              if (syncToken) {
                await syncAllToCloud(); // クラウドも空の状態で上書き
              }
              
              alert('データをすべてリセットしました。画面を再読み込みします。');
              window.location.reload();
            }
          }}
          style={{ marginTop: '8px', padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center', width: '100%' }}
        >
          {isStealthMode ? '' : '🗑️ '}バグデータをリセット（初期化）
        </button>

        <h3 style={{ margin: '10px 0 0', color: '#4ade80' }}>{isStealthMode ? '' : '📊 '}成績・学習記録</h3>
        <div style={{ marginBottom: '8px' }}>
          <button onClick={exportStatsToCSV} style={{ width: '100%', padding: '8px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isStealthMode ? '' : '📊 '}成績をCSVで書き出し (Excel用)
          </button>
        </div>
        
        {Object.keys(stats).length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>まだ記録がありません。クイズに答えよう！</div>
        ) : (
          <div style={{ fontSize: '0.8rem', display: 'grid', gap: '4px' }}>
            {Object.entries(stats).map(([qId, s]) => {
              if (!s || typeof s !== 'object') return null;
              const correct = s.correct || 0;
              const incorrect = s.incorrect || 0;
              const total = correct + incorrect;
              const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
              return (
                <div key={qId} style={{ background: '#ffffff', padding: '6px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', borderLeft: `3px solid ${rate >= 80 ? '#4ade80' : rate <= 40 ? '#f87171' : '#facc15'}` }}>
                  <span>Q-ID: {qId}</span>
                  <span>正解: {correct} / 不正解: {incorrect} ({rate}%)</span>
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
      onImportCustomWords={handleImportCSV}
      onClearCustomWords={() => {
        setCustomWords([]);
        localStorage.removeItem('learning_rpg_custom_questions');
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

  // Initialize/Restart Game
  const startNewGame = () => {
    setIsStoryLoading(true);
    setFloorStory(null);
    setIsStoryLoading(false);
    chattersPoolRef.current = [];
    chatterIndexRef.current = 0;

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

  };

  // Load first floor on mount
  useEffect(() => {
    startNewGame();
  }, []);
  // Set up next floor
  const loadNextFloor = (nextFloorNum) => {
    setIsStoryLoading(true);
    setFloorStory(null);
    setIsStoryLoading(false);
    chattersPoolRef.current = [];
    chatterIndexRef.current = 0;

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
          dealDamage: (dmg, target, options) => {
            let baseDmg = dmg === 'block' ? nextBattle.playerBlock : dmg;
            
            // 筋力の適用
            const strMulti = options?.strengthMultiplier || 1;
            baseDmg += (nextBattle.playerStatus.strength || 0) * strMulti;

            // 弱体化（Weak）の適用: ダメージ25%減少
            if (nextBattle.playerStatus.weak > 0) {
              baseDmg = Math.floor(baseDmg * 0.75);
            }

            let finalDmg = baseDmg;
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
            let finalBlk = blk;
            nextBattle.playerBlock += finalBlk;
            addLog(`ブロックを ${finalBlk} えた。`, 'system');
          },
          heal: (amount) => {
            nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + amount);
            addLog(`HPが ${amount} かいふくした！`, 'level-up');
          },
          applyStatus: (target, type, amount) => {
            if (type === 'poison') {
              nextBattle.enemyStatus.poison = (nextBattle.enemyStatus.poison || 0) + amount;
              addLog(`てきに ${amount} の「どく」をあたえた！`, 'system');
            }
          },
          applyStatusToAll: () => {},
          gainStrength: () => {},
          addTurnEndEffect: () => {},
          addPower: () => {},
          drawCards: (count) => {
            let drawn = 0;
            for (let i = 0; i < count; i++) {
              if (nextBattle.drawPile.length === 0) {
                if (nextBattle.discardPile.length === 0) break;
                nextBattle.drawPile = [...nextBattle.discardPile].sort(() => Math.random() - 0.5);
                nextBattle.discardPile = [];
                addLog('すてふだをシャッフルして、やまふだにもどした。', 'system');
              }
              const c = nextBattle.drawPile.pop();
              if (c) {
                nextBattle.hand.push(c);
                drawn++;
              }
            }
            if (drawn > 0) {
              addLog(`カードを ${drawn} 枚ひいた！`, 'system');
            }
          },
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
        handleEnemyDefeat(nextBattle.enemy, nextPlayer);
        setActiveQuiz(null);
        return;
      }

      setBattle(nextBattle);
      setPlayer(nextPlayer);
    }
    setActiveQuiz(null);
  };

  // Turn logic execution (Synchronous State Resolution)

  const triggerAIComment = async () => {
    if (aiComment) return;

    setAiComment({ loading: true });

    let result;
    if (activeQuiz && activeQuiz.questionObj) {
      result = await generateQuizHint(activeQuiz.questionObj);
    } else {
      const gameState = {
        hp: player.hp,
        maxHp: player.maxHp,
        floor: player.floor,
        inBattle: !!battle,
        enemyName: battle ? battle.enemy.name : null,
        enemyHp: battle ? battle.enemy.hp : null
      };
      result = await generateGameStateComment(gameState);
    }
    
    
    if (result && result.comment) {
      setAiComment({ text: result.comment, loading: false });
      addLog(`🧙‍♂️ 先生: ${result.comment}`, 'system');
      
      if (mapMessageTimerRef.current) clearTimeout(mapMessageTimerRef.current);
      mapMessageTimerRef.current = setTimeout(() => {
        setAiComment(null);
      }, 5000);
    } else {
      setAiComment(null);
    }
  };

  const handleMove = (dx, dy) => {
    if (gameOver || gameVictory || activeQuiz || battle || campsite || cardReward) return;

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
      if (player.shieldLevel || player.shieldEquipped) {
        startingBlock += (player.shieldLevel || 2) * 2;
      }
      if (player.relics && player.relics.some(r => r.key === 'iron_shield')) {
        startingBlock += 5;
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
        playerEnergy: player.maxEnergy || 3,
        playerMaxEnergy: player.maxEnergy || 3,
        playerBlock: startingBlock,
        playerStatus: {
          strength: ((player.relics && player.relics.some(r => r.key === 'strength_ring')) ? 1 : 0) + (player.swordLevel || (player.swordEquipped ? 2 : 0)),
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
        } else if (item.subType === 'shop') {
          const shopItems = [];
          const itemPool = ['potion', 'golden_apple', 'energy_crystal', 'magic_bag'];
          const costs = { 'potion': 30, 'golden_apple': 75, 'energy_crystal': 150, 'magic_bag': 150 };
          const names = { 'potion': 'ポーション', 'golden_apple': 'おうごんのリンゴ', 'energy_crystal': 'エネルギークリスタル', 'magic_bag': 'まほうのふくろ' };
          
          let selectedItemKey = itemPool[Math.floor(Math.random() * 2)];
          if (nextPlayer.floor >= 3 && Math.random() < 0.3) {
            selectedItemKey = itemPool[2 + Math.floor(Math.random() * 2)];
          }
          shopItems.push({ key: selectedItemKey, name: names[selectedItemKey], cost: costs[selectedItemKey] });
          
          const shopWeapons = [];
          const curSwordLv = nextPlayer.swordLevel || (nextPlayer.swordEquipped ? 2 : 0);
          const curShieldLv = nextPlayer.shieldLevel || (nextPlayer.shieldEquipped ? 2 : 0);
          if (curSwordLv < 5) shopWeapons.push({ key: 'sword', name: `剣を強化(Lv.${curSwordLv+1})`, cost: 100 + curSwordLv * 50 });
          if (curShieldLv < 5) shopWeapons.push({ key: 'shield', name: `盾を強化(Lv.${curShieldLv+1})`, cost: 100 + curShieldLv * 50 });

          setShop({
            cards: getRandomRewardCards(nextPlayer.floor),
            items: shopItems,
            weapons: shopWeapons,
            removeCost: 50 + (nextPlayer.removedCount || 0) * 25,
            removeMode: false
          });
          addLog('商人に出会った。', 'system');
        } else if (item.subType === 'sword') {
          const curLv = nextPlayer.swordLevel || (nextPlayer.swordEquipped ? 2 : 0);
          nextPlayer.swordLevel = curLv + 1;
          nextPlayer.swordEquipped = true;
          addLog(`遺物「${item.name}」を手に入れた！(剣Lv.${curLv+1} : 筋力+${curLv+1})`, 'item-pickup');
        } else if (item.subType === 'shield') {
          const curLv = nextPlayer.shieldLevel || (nextPlayer.shieldEquipped ? 2 : 0);
          nextPlayer.shieldLevel = curLv + 1;
          nextPlayer.shieldEquipped = true;
          addLog(`遺物「${item.name}」を手に入れた！(盾Lv.${curLv+1} : ブロック+${(curLv+1)*2})`, 'item-pickup');
        } else if (item.subType === 'energy_crystal') {
          nextPlayer.maxEnergy = (nextPlayer.maxEnergy || 3) + 1;
          addLog(`「${item.name}」を拾った！さいだいエネルギーが 1 ふえた！`, 'level-up');
        } else if (item.subType === 'magic_bag') {
          nextPlayer.maxDraw = (nextPlayer.maxDraw || 3) + 1;
          addLog(`「${item.name}」を拾った！まいターン引けるカードが 1 まい増えた！`, 'level-up');
        } else if (item.subType === 'golden_apple') {
          nextPlayer.maxHp += 10;
          nextPlayer.hp += 10;
          addLog(`「${item.name}」を食べた！さいだいHPが 10 ふえて、10 かいふくした！`, 'level-up');
        } else if (item.subType === 'magic_book') {
          const upgradableCards = nextPlayer.deck.filter(c => !c.upgraded);
          if (upgradableCards.length > 0) {
            const randomCard = upgradableCards[Math.floor(Math.random() * upgradableCards.length)];
            const index = nextPlayer.deck.findIndex(c => c.id === randomCard.id);
            if (index !== -1) {
              const upgradedCard = createCardInstance(randomCard.key, true);
              upgradedCard.id = randomCard.id;
              nextPlayer.deck[index] = upgradedCard;
              addLog(`「${item.name}」を読んだ！デッキの「${randomCard.name}」が強化された！`, 'level-up');
            }
          } else {
            addLog(`「${item.name}」を見つけたが、これ以上強化できるカードがなかった。`, 'system');
          }
        }

        nextItems.splice(itemIndex, 1);
      }

      nextPlayer.x = tx;
      nextPlayer.y = ty;
      playMoveSound();


      if (Math.random() < 0.15) {
        const sequence = chattersPoolRef.current;
        if (chatterIndexRef.current < sequence.length) {
          const nextChatter = sequence[chatterIndexRef.current];
          setMapMessage(nextChatter);
          addLog(`「${nextChatter}」`, 'system');
          if (mapMessageTimerRef.current) clearTimeout(mapMessageTimerRef.current);
          mapMessageTimerRef.current = setTimeout(() => {
            setMapMessage(null);
          }, 4500);
          chatterIndexRef.current++;
        }
      }

      // 新しい部屋に入ったかチェックして描写を出す
      const currentRoomIndex = rooms.findIndex(r => 
        tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h
      );
      if (currentRoomIndex !== -1 && !visitedRoomsRef.current.has(currentRoomIndex)) {
        visitedRoomsRef.current.add(currentRoomIndex);
      }

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
      // Ignore if typing in an input field (e.g. Spelling Quiz)
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
      }

      // Global AI Comment shortcut
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        triggerAIComment();
        return;
      }

      if (gameOver) {
        if (e.key === 'Enter') startNewGame();
        return;
      }
      if (gameVictory) {
        if (e.key === 'Enter') startNewGame();
        return;
      }
      if (activeQuiz) return;
      
      if (battle) {
        if (battle.battleLog && battle.battleLog.length > 0) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            setBattle(prev => ({ ...prev, battleLog: [] }));
          }
          return;
        }

        const itemCount = battle.hand.length + 1;
        let currentIdx = Math.min(battleFocusIndex, itemCount - 1);
        let newIdx = currentIdx;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          newIdx = currentIdx > 0 ? currentIdx - 1 : itemCount - 1;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          newIdx = currentIdx < itemCount - 1 ? currentIdx + 1 : 0;
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (currentIdx === battle.hand.length) {
            handleEndTurn();
          } else {
            const card = battle.hand[currentIdx];
            if (battle.playerEnergy >= card.cost) {
              handleCardClick(card);
            } else {
              addLog(`エネルギーが足りない！`, 'system');
            }
          }
          return;
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          handleEndTurn();
          return;
        } else if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key) - 1;
          if (idx < battle.hand.length) {
            e.preventDefault();
            const card = battle.hand[idx];
            if (battle.playerEnergy >= card.cost) {
              handleCardClick(card);
            } else {
              addLog(`エネルギーが足りない！`, 'system');
            }
          }
          return;
        }
        setBattleFocusIndex(newIdx);
        return;
      }
      if (campsite) {
        if (!campsite.showSmithDeck) {
          let currentIdx = Math.min(campsiteActionFocusIndex, 1);
          let newIdx = currentIdx;
          if (['ArrowUp', 'ArrowLeft', 'w', 'a', 'W', 'A'].includes(e.key)) {
            e.preventDefault();
            newIdx = currentIdx === 0 ? 1 : 0;
          } else if (['ArrowDown', 'ArrowRight', 's', 'd', 'S', 'D'].includes(e.key)) {
            e.preventDefault();
            newIdx = currentIdx === 0 ? 1 : 0;
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (currentIdx === 0) {
              handleCampsiteRest();
            } else {
              setCampsite(prev => ({ ...prev, showSmithDeck: true }));
              setCampsiteCardFocusIndex(0);
            }
            return;
          }
          setCampsiteActionFocusIndex(newIdx);
        } else {
          const itemCount = player.deck.length + 1; // deck + back button
          let currentIdx = Math.min(campsiteCardFocusIndex, itemCount - 1);
          let newIdx = currentIdx;

          const N = player.deck.length;
          if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
            e.preventDefault();
            if (currentIdx !== N) {
              newIdx = (currentIdx % 2 === 1) ? currentIdx - 1 : Math.min(currentIdx + 1, N - 1);
            } else if (N > 0) {
              newIdx = N - 1;
            }
          } else if (['ArrowRight', 'd', 'D'].includes(e.key)) {
            e.preventDefault();
            if (currentIdx !== N) {
              newIdx = (currentIdx % 2 === 0) ? Math.min(currentIdx + 1, N - 1) : currentIdx - 1;
            } else if (N > 0) {
              newIdx = 0;
            }
          } else if (['ArrowUp', 'w', 'W'].includes(e.key)) {
            e.preventDefault();
            if (currentIdx === N) newIdx = N > 0 ? N - 1 : N;
            else if (currentIdx < 2) newIdx = N;
            else newIdx = currentIdx - 2;
          } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
            e.preventDefault();
            if (currentIdx === N) newIdx = N > 0 ? 0 : N;
            else if (currentIdx + 2 < N) newIdx = currentIdx + 2;
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (currentIdx === player.deck.length) {
              setCampsite(prev => ({ ...prev, showSmithDeck: false }));
            } else {
              const card = player.deck[currentIdx];
              if (!card.upgraded) {
                handleCampsiteUpgrade(card);
              }
            }
            return;
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setCampsite(prev => ({ ...prev, showSmithDeck: false }));
            return;
          }
          setCampsiteCardFocusIndex(newIdx);
        }
        return;
      }
      if (cardReward) {
        const itemCount = cardReward.choices.length + 1; // cards + skip button
        let currentIdx = Math.min(cardRewardFocusIndex, itemCount - 1);
        let newIdx = currentIdx;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          newIdx = currentIdx > 0 ? currentIdx - 1 : itemCount - 1;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          newIdx = currentIdx < itemCount - 1 ? currentIdx + 1 : 0;
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (currentIdx === cardReward.choices.length) {
            addLog((isStealthMode ? 'カードスキップ。' : '🏃‍♂️ カードスキップ。'), 'system');
            setCardReward(null);
          } else {
            const card = cardReward.choices[currentIdx];
            setPlayer(prev => ({ ...prev, deck: [...prev.deck, card] }));
            addLog(`${isStealthMode ? '' : '🎉 '}デッキに「${card.name}」追加。`, 'system');
            setCardReward(null);
            setShop(null);
          }
          return;
        } else if (e.key >= '1' && e.key <= '3') {
          const idx = parseInt(e.key) - 1;
          if (idx < cardReward.choices.length) {
            e.preventDefault();
            const card = cardReward.choices[idx];
            setPlayer(prev => ({ ...prev, deck: [...prev.deck, card] }));
            addLog(`${isStealthMode ? '' : '🎉 '}デッキに「${card.name}」追加。`, 'system');
            setCardReward(null);
            setShop(null);
          }
          return;
        }
        
        setCardRewardFocusIndex(newIdx);
        return;
      }

      if (shop) {
        if (shop.removeMode) {
          const itemCount = player.deck.length + 1; // deck + cancel
          let currentIdx = Math.min(shopFocusIndex, itemCount - 1);
          let newIdx = currentIdx;

          if (['ArrowLeft', 'ArrowUp', 'w', 'a', 'W', 'A'].includes(e.key)) {
            e.preventDefault(); newIdx = currentIdx > 0 ? currentIdx - 1 : itemCount - 1;
          } else if (['ArrowRight', 'ArrowDown', 's', 'd', 'S', 'D'].includes(e.key)) {
            e.preventDefault(); newIdx = currentIdx < itemCount - 1 ? currentIdx + 1 : 0;
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (currentIdx === player.deck.length) {
              setShop(prev => ({ ...prev, removeMode: false }));
              setShopFocusIndex(0);
            } else {
              handleShopRemoveCardSelect(currentIdx);
            }
            return;
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setShop(prev => ({ ...prev, removeMode: false }));
            setShopFocusIndex(0);
            return;
          }
          setShopFocusIndex(newIdx);
        } else {
          const buyableCount = (shop.cards ? shop.cards.length : 0) 
                             + (shop.items ? shop.items.length : 0) 
                             + (shop.weapons ? shop.weapons.length : 0) 
                             + 3; // Heal, Remove, Leave
          let currentIdx = Math.min(shopFocusIndex, buyableCount - 1);
          let newIdx = currentIdx;
          
          if (['ArrowLeft', 'ArrowUp', 'w', 'a', 'W', 'A'].includes(e.key)) {
            e.preventDefault(); newIdx = currentIdx > 0 ? currentIdx - 1 : buyableCount - 1;
          } else if (['ArrowRight', 'ArrowDown', 's', 'd', 'S', 'D'].includes(e.key)) {
            e.preventDefault(); newIdx = currentIdx < buyableCount - 1 ? currentIdx + 1 : 0;
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            
            let tempIdx = 0;
            let actionDone = false;
            
            // Cards
            if (shop.cards && !actionDone) {
              for (let i=0; i<shop.cards.length; i++) {
                if (tempIdx === currentIdx) { handleShopBuyCard(shop.cards[i]); actionDone = true; break; }
                tempIdx++;
              }
            }
            
            // Items
            if (shop.items && !actionDone) {
              for (let i=0; i<shop.items.length; i++) {
                if (tempIdx === currentIdx) { handleShopBuyItem(shop.items[i]); actionDone = true; break; }
                tempIdx++;
              }
            }
            
            // Weapons
            if (shop.weapons && !actionDone) {
              for (let i=0; i<shop.weapons.length; i++) {
                if (tempIdx === currentIdx) { handleShopBuyWeapon(shop.weapons[i]); actionDone = true; break; }
                tempIdx++;
              }
            }
            
            // Heal
            if (!actionDone) {
              if (tempIdx === currentIdx) { handleShopHeal(); actionDone = true; }
              tempIdx++;
            }
            
            // Remove
            if (!actionDone) {
              if (tempIdx === currentIdx) { 
                if (player.gold >= shop.removeCost && player.deck.length > 1) {
                  setShop(prev => ({ ...prev, removeMode: true })); 
                  setShopFocusIndex(0);
                } else {
                  addLog('ゴールドが足りないか、削除できるカードがありません。', 'system');
                }
                actionDone = true;
              }
              tempIdx++;
            }
            
            // Leave
            if (!actionDone) {
              if (tempIdx === currentIdx) { handleShopLeave(); }
            }
          }
          setShopFocusIndex(newIdx);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, grid, rooms, enemies, items, gameOver, gameVictory, activeQuiz, battle, campsite, cardReward, isStoryLoading, floorStory, battleFocusIndex, cardRewardFocusIndex, campsiteActionFocusIndex, campsiteCardFocusIndex, shop, shopFocusIndex, aiComment]);

  const VIEWPORT_RADIUS = 15;
  const renderGrid = [];
  
  if (grid.length > 0) {
    const currentRows = grid.length;
    const currentCols = grid[0].length;
    
    for (let r = player.y - VIEWPORT_RADIUS; r <= player.y + VIEWPORT_RADIUS; r++) {
      const row = [];
      for (let c = player.x - VIEWPORT_RADIUS; c <= player.x + VIEWPORT_RADIUS; c++) {
        if (r < 0 || r >= currentRows || c < 0 || c >= currentCols) {
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
    <div className={`app-container retro-theme ${isStealthMode ? 'stealth-theme' : ''} ${screenShake ? 'shake-effect flash-damage' : ''}`}>
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
              {isStealthMode ? '' : '🗺️ '}MAP & BATTLE
            </button>
            <button 
              className={`control-btn ${windows.status.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('status')}
            >
              {isStealthMode ? '' : '📊 '}STATUS
            </button>
            <button 
              className={`control-btn ${windows.logs.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('logs')}
            >
              {isStealthMode ? '' : '📜 '}LOGS
            </button>
            <button 
              className={`control-btn ${windows.legend.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('legend')}
            >
              {isStealthMode ? '' : '🔑 '}LEGEND
            </button>
            <button 
              className={`control-btn ${windows.wordlist.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('wordlist')}
            >
              {isStealthMode ? '' : '📖 '}DECK & WORDS ({Object.keys(learnedWords).length})
            </button>
            <button 
              className={`control-btn ${windows.settings?.visible ? 'active' : ''}`}
              onClick={() => toggleWindow('settings')}
            >
              {isStealthMode ? '' : '⚙️ '}SETTINGS
            </button>
            <button 
              className="control-btn reset-layout-btn"
              onClick={resetWindows}
            >
              {isStealthMode ? '' : '🔄 '}RESET
            </button>
          </div>
        ) : (
          <div className="panel-tabs">
            <button 
              type="button"
              className={`panel-tab-btn ${rightTab === 'status' ? 'active' : ''}`}
              onClick={() => setRightTab('status')}
            >
              {isStealthMode ? '' : '📊 '}プレイ画面
            </button>
            <button 
              type="button"
              className={`panel-tab-btn ${rightTab === 'wordlist' ? 'active' : ''}`}
              onClick={() => setRightTab('wordlist')}
            >
              {isStealthMode ? '' : '📖 '}デッキ & 単語 ({Object.keys(learnedWords).length})
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
      {/* Debug Info */}
      <div style={{ position: 'fixed', bottom: 5, right: 5, fontSize: '10px', color: '#fff', background: 'rgba(0,0,0,0.7)', padding: '4px', zIndex: 9999 }}>
        Questions: {getCustomQuestions().length > 0 ? `Custom (${getCustomQuestions().length})` : 'Default'} 
        | Loaded: {QUESTIONS_DB.length}
        | Exps: {QUESTIONS_DB.filter(q => q.explanation).length}
      </div>
      {/* Global AI Comment Overlay */}
      {aiComment && !aiComment.loading && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(59, 130, 246, 0.95)',
          border: '2px solid #2563eb',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxWidth: '280px',
          fontSize: '0.85rem',
          lineHeight: '1.4',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '4px' }}>🧙‍♂️ AI先生</strong>
          {aiComment.text}
        </div>
      )}

      {/* Settings Button */}
      {!gameOver && !gameVictory && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: '#4b5563',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 900
          }}
        >
          ⚙️
        </button>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div style={{
            background: '#1f2937', padding: '24px', borderRadius: '12px',
            color: 'white', maxWidth: '400px', width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>⚙️ 設定</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Gemini APIキー (任意)</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AI機能を使う場合に入力"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px', lineHeight: '1.4' }}>
                ※公開サイト上でAI先生を機能させるにはAPIキーの入力が必要です。入力内容はブラウザの内部にのみ保存され、外部に送信されることはありません。
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowSettings(false)} style={{ padding: '8px 16px', background: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={saveApiKey} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual AI Comment Trigger Button */}
      {!gameOver && !gameVictory && (
        <button
          onClick={triggerAIComment}
          disabled={aiComment && aiComment.loading}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 900,
            transition: 'background 0.2s',
            opacity: (aiComment && aiComment.loading) ? 0.6 : 1
          }}
        >
          {aiComment && aiComment.loading ? '⏳ 考え中...' : '💡 先生に相談'}
        </button>
      )}
    </div>
  );
}

export default App;
