import React, { useState, useEffect } from 'react';
import { generateMemoryFloorStory } from './utils/gemini';

// 視野制限の半径 (プレイヤー周囲15マスの viewport)
const VIEWPORT_RADIUS = 15;

// Learning RPG 本物のダンジョン生成アルゴリズム (階層に応じて徐々に部屋数とサルベージ数が滑らかに増えていく仕様)
const generateSimpleDungeon = (floor, storyObjects, npcData) => {
  const COLS = Math.min(100, 30 + (floor - 1) * 10);
  const ROWS = Math.min(100, 30 + (floor - 1) * 10);
  
  const grid = [];
  
  // マップを壁で初期化
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ char: '#', type: 'wall' });
    }
    grid.push(row);
  }

  // サルベージオブジェクトの必要数
  const defaultStoryObjects = [
    { id: 'A', name: '未デコードデータA', text: 'セクターA of データ復元を実行中... 接続が不完全です。' },
    { id: 'B', name: '未デコードデータB', text: 'セクターB of データ復元を実行中... 接続が不完全です。' },
    { id: 'C', name: '未デコードデータC', text: 'セクターC of データ復元を実行中... 接続が不完全です。' },
    { id: 'D', name: '未デコードデータD', text: 'セクターD of データ復元を実行中... 接続が不完全です。' }
  ];
  const rawObjects = storyObjects || defaultStoryObjects;
  const salvageCount = rawObjects.length;

  // 目標部屋数 = スタート部屋(1) + NPC部屋(1) + サルベージ部屋数
  const targetRooms = salvageCount + 2;

  const rooms = [];
  const minSize = 5;

  // 部屋のランダム生成
  let attempts = 0;
  const maxAttempts = targetRooms * 60;
  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts++;
    const currentMaxSize = Math.random() < 0.2 ? 12 : 8;
    const w = Math.floor(Math.random() * (currentMaxSize - minSize + 1)) + minSize;
    const h = Math.floor(Math.random() * (currentMaxSize - minSize + 1)) + minSize;
    const x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
    const y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;

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
      
      // 部屋の床を削る
      for (let r = y; r < y + h; r++) {
        for (let c = x; c < x + w; c++) {
          grid[r][c] = { char: '.', type: 'floor' };
        }
      }
    }
  }

  // 目標部屋数に満たない場合の等間隔フォールバック生成
  if (rooms.length < targetRooms) {
    rooms.length = 0;
    const colsCount = Math.ceil(Math.sqrt(targetRooms));
    const rowsCount = Math.ceil(targetRooms / colsCount);
    const cellW = Math.floor(COLS / colsCount);
    const cellH = Math.floor(ROWS / rowsCount);

    for (let i = 0; i < targetRooms; i++) {
      const cellX = i % colsCount;
      const cellY = Math.floor(i / colsCount);
      const rx = cellX * cellW + 2;
      const ry = cellY * cellH + 2;
      const rw = Math.min(6, cellW - 4);
      const rh = Math.min(5, cellH - 4);
      
      rooms.push({
        x: rx, y: ry, w: rw, h: rh,
        cx: Math.floor(rx + rw / 2),
        cy: Math.floor(ry + rh / 2)
      });

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          grid[y][x] = { char: '.', type: 'floor' };
        }
      }
    }
  }

  // 通路の接続
  for (let i = 1; i < rooms.length; i++) {
    const r1 = rooms[i - 1];
    const r2 = rooms[i];

    const startX = Math.min(r1.cx, r2.cx);
    const endX = Math.max(r1.cx, r2.cx);
    for (let cx = startX; cx <= endX; cx++) {
      grid[r1.cy][cx] = { char: '.', type: 'floor' };
    }

    const startY = Math.min(r1.cy, r2.cy);
    const endY = Math.max(r1.cy, r2.cy);
    for (let cy = startY; cy <= endY; cy++) {
      grid[cy][r2.cx] = { char: '.', type: 'floor' };
    }
  }

  // プレイヤー開始位置
  const startPos = { x: rooms[0].cx, y: rooms[0].cy };

  // 階段の設置
  const lastRoom = rooms[rooms.length - 1];
  grid[lastRoom.cy][lastRoom.cx] = { char: '>', type: 'stairs' };
  const stairsPos = { x: lastRoom.cx, y: lastRoom.cy };

  // 配置用の部屋リストを抽出 (プレイヤー開始部屋[0]を除外)
  const availableRooms = rooms.slice(1);
  
  // シャッフル
  for (let i = availableRooms.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableRooms[i], availableRooms[j]] = [availableRooms[j], availableRooms[i]];
  }

  let roomIndex = 0;

  // 7. 観察者NPC (N) を1部屋に1つのルールで配置
  const npcRoom = availableRooms[roomIndex];
  roomIndex++;
  
  const npcObj = npcData && npcRoom ? {
    char: 'N',
    type: 'npc',
    name: npcData.name || '観測者',
    text: npcData.text || '……。',
    x: npcRoom.cx,
    y: npcRoom.cy
  } : null;

  if (npcObj) {
    if (npcObj.x === stairsPos.x && npcObj.y === stairsPos.y) {
      npcObj.x = npcObj.x + 1;
    }
    grid[npcObj.y][npcObj.x] = { char: 'N', type: 'npc', id: 'N' };
  }

  // 8. 回収オブジェクトを部屋の重心に1部屋最大1つずつ配置
  const objects = [];
  const chars = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  
  for (let i = 0; i < salvageCount; i++) {
    const targetRoom = availableRooms[roomIndex];
    roomIndex++;

    if (!targetRoom) break;

    const objX = targetRoom.cx;
    let objY = targetRoom.cy;

    if (objX === stairsPos.x && objY === stairsPos.y) {
      objY = objY + 1;
    }

    objects.push({
      ...rawObjects[i],
      id: chars[i] || '?',
      char: chars[i] || '?',
      x: objX,
      y: objY,
      found: false
    });
  }

  objects.forEach(obj => {
    if (grid[obj.y][obj.x].type !== 'stairs' && grid[obj.y][obj.x].type !== 'npc') {
      grid[obj.y][obj.x] = { char: obj.char, type: 'object', id: obj.id };
    }
  });

  return { grid, startPos, stairsPos, objects, npc: npcObj, rooms, cols: COLS, rows: ROWS };
};

export default function MemoryRPG() {
  const [floor, setFloor] = useState(1);
  const [dungeon, setDungeon] = useState(null);
  const [rooms, setRooms] = useState([]); 
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [objects, setObjects] = useState([]);
  const [observerNpc, setObserverNpc] = useState(null); 
  const [exploredTiles, setExploredTiles] = useState({}); 
  const [allFound, setAllFound] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]); 
  const [recoveredTexts, setRecoveredTexts] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false); 
  const [debugLog, setDebugLog] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0); 

  const apiKeyInfo = localStorage.getItem('GEMINI_API_KEY') 
    ? '設定済み (localStorage)' 
    : (import.meta.env.VITE_GEMINI_API_KEY ? '設定済み (Vite環境変数)' : '未設定 (フォールバックデータが使用されます)');

  // 階層読み込み時の処理
  useEffect(() => {
    let active = true;
    const fetchStoryAndBuildDungeon = async () => {
      setIsLoading(true);
      setIsLoadError(false);
      setDebugLog('');
      setObjects([]); 
      setObserverNpc(null); 
      try {
        const seedStr = 'seed-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();

        // 階層に応じて、サルベージ個数を滑らかに「じょじょに」増やす
        const salvageCount = Math.min(12, 4 + (floor - 1));

        const storyData = await generateMemoryFloorStory(floor, seedStr, salvageCount);
        if (!active) return;

        if (storyData.message && storyData.message.includes('エラー')) {
          setDebugLog(`APIからの返却データにエラーが含まれています: ${storyData.message}`);
        }

        const npcData = (storyData.npcName && storyData.npcText) ? {
          name: storyData.npcName,
          text: storyData.npcText
        } : {
          name: '観測者',
          text: '……このセクターのログにも、かつて呼吸していた誰かの体温が混ざっているな。'
        };

        const data = generateSimpleDungeon(floor, storyData.objects, npcData);
        setDungeon(data.grid);
        setRooms(data.rooms);
        setPlayer(data.startPos);
        setObjects(data.objects);
        setObserverNpc(data.npc);
        setExploredTiles({}); 
        setAllFound(false);
        setRecoveredTexts([]); 
        
        setSystemLogs([
          { type: 'system', text: storyData.message || `第${floor}階層に接続しました。` }
        ]);
      } catch (err) {
        if (active) {
          setIsLoadError(true);
          setDebugLog(`Dungeon構築エラー: ${err.message || err}`);
          const dummyData = generateSimpleDungeon(floor, null, null);
          setDungeon(dummyData.grid);
          setRooms(dummyData.rooms);
          setPlayer(dummyData.startPos);
          setObjects(dummyData.objects);
          setObserverNpc(dummyData.npc);
          setExploredTiles({});

          setSystemLogs([
            { type: 'error', text: `セクターのデコードに失敗しました。詳細: ${err.message || err}` }
          ]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchStoryAndBuildDungeon();

    return () => {
      active = false;
    };
  }, [floor, retryTrigger]);

  // すべて見つかったか監視
  useEffect(() => {
    if (objects.length > 0 && objects.every(o => o.found)) {
      setAllFound(true);
      setSystemLogs(prev => [
        { type: 'success', text: 'すべてのデータの断片を回収しました。ゲート [>] から次の階層へ降下できます。' },
        ...prev
      ]);
    }
  }, [objects]);

  // Fog of War (視界開示処理)
  useEffect(() => {
    if (!dungeon || dungeon.length === 0 || rooms.length === 0) return;

    const currentRows = dungeon.length;
    const currentCols = dungeon[0].length;

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

      // プレイヤーの周囲5x5を視界開示
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const tx = player.x + c;
          const ty = player.y + r;
          if (tx >= 0 && tx < currentCols && ty >= 0 && ty < currentRows) {
            mark(tx, ty);
          }
        }
      }

      // プレイヤーが部屋の中にいるなら、その部屋全体を視界開示
      for (const room of rooms) {
        if (player.x >= room.x && player.x < room.x + room.w &&
            player.y >= room.y && player.y < room.y + room.h) {
          for (let ry = room.y - 1; ry <= room.y + room.h; ry++) {
            for (let rx = room.x - 1; rx <= room.x + room.w; rx++) {
              if (rx >= 0 && rx < currentCols && ry >= 0 && ry < currentRows) {
                mark(rx, ry);
              }
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, [player.x, player.y, dungeon, rooms]);

  const movePlayer = (dx, dy) => {
    if (!dungeon || isLoading || isLoadError) return;
    
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newY < 0 || newY >= dungeon.length || newX < 0 || newX >= dungeon[0].length) return;

    const tile = dungeon[newY][newX];
    if (tile.type === 'wall') return;

    setPlayer({ x: newX, y: newY });

    // オブジェクトに接触
    if (tile.type === 'object') {
      const objId = tile.id;
      const targetObj = objects.find(o => o.id === objId);
      
      if (targetObj) {
        if (targetObj.found) {
          setSystemLogs(prev => [
            { type: 'system', text: `[${targetObj.name}] のデータはすでにサルベージ済みです。` },
            ...prev
          ]);
        } else {
          const foundCount = objects.filter(o => o.found).length;
          
          // A~Zの順番で厳密にデータ回収を行う順序チェック
          const chars = Array.from({ length: objects.length }, (_, i) => String.fromCharCode(65 + i));
          const expectedId = chars[foundCount];
          
          if (objId === expectedId) {
            setObjects(prev => prev.map(obj => {
              if (obj.id === objId) {
                return { ...obj, found: true };
              }
              return obj;
            }));
            
            setSystemLogs(prev => [
              { type: 'diary_reveal', name: targetObj.name, text: targetObj.text },
              { type: 'system', text: `[${targetObj.name}] のデータ（断片 ${foundCount + 1}/${objects.length}）をサルベージしました。` },
              ...prev
            ]);

            setRecoveredTexts(prev => [
              ...prev,
              { name: targetObj.name, text: targetObj.text, count: foundCount + 1 }
            ]);
          } else {
            const correctNextName = objects[foundCount] ? objects[foundCount].name : expectedId;
            setSystemLogs(prev => [
              { type: 'error', text: `データリンクエラー：[${objId}] は現在デコードできません。先に [${correctNextName}] を接続してください。` },
              ...prev
            ]);
          }
        }
      }
    }

    // 観察者NPCに接触
    if (tile.type === 'npc' && observerNpc) {
      setSystemLogs(prev => [
        { type: 'npc_dialog', name: observerNpc.name, text: observerNpc.text },
        ...prev
      ]);
    }

    // 階段に到達
    if (tile.type === 'stairs') {
      if (!allFound) {
        setSystemLogs(prev => [
          { type: 'error', text: 'まだこの階層のデータ回収が完了していません。すべてのオブジェクトを調査してください。' },
          ...prev
        ]);
      } else {
        setFloor(prev => prev + 1);
      }
    }
  };

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLoading || isLoadError) return; 

      const keysToPrevent = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
      if (keysToPrevent.includes(e.key)) {
        e.preventDefault(); 
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') movePlayer(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') movePlayer(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') movePlayer(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') movePlayer(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, dungeon, allFound, objects, isLoading, isLoadError]);

  const handleRetry = () => {
    setRetryTrigger(prev => prev + 1);
  };

  if (!dungeon) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280' }}>接続を初期化中...</div>;

  const currentRows = dungeon.length;
  const currentCols = dungeon[0].length;

  // プレイヤーを中心に縦横半径15マスの視野グリッドを切り出す
  const renderGrid = [];
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

      let tile = dungeon[r][c];
      if (player.x === c && player.y === r) {
        row.push({ char: '@', type: 'player' });
      } else {
        row.push(tile);
      }
    }
    renderGrid.push(row);
  }

  return (
    <div className="memory-rpg-container" style={{ padding: '40px 20px', fontFamily: 'monospace', backgroundColor: '#f3f4f6', color: '#1f2937', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      {/* 3カラム横並びコンテナ (左から順に: 1. マップ, 2. タイムライン, 3. サルベージログ) */}
      <div style={{ maxWidth: '1400px', width: '100%', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* カラム1: マップ表示エリア (左端・幅 520px 固定) */}
        <div style={{ flex: '0 0 520px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#6b7280' }}>Memory RPG (電脳回廊)</h1>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '5px' }}>第 {floor} 階層 (電脳深度: {floor * 100}m)</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', backgroundColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%', boxSizing: 'border-box', opacity: isLoadError ? 0.45 : 1 }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '340px', justifyContent: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>[ SYSTEM: ACCESSING ARCHIVE... ]</div>
                <div style={{ fontSize: '13px' }}>古いセクターをデコードしています。</div>
              </div>
            ) : (
              <div style={{ fontFamily: 'monospace', fontSize: '15px', lineHeight: '1.2', letterSpacing: '1px', display: 'block', margin: '0 auto' }}>
                {renderGrid.map((row, rIndex) => (
                  <div key={rIndex} style={{ display: 'flex' }}>
                    {row.map((cell, cIndex) => {
                      let char = cell.char;
                      let color = '#9ca3af'; 

                      if (cell.type === 'player') {
                        char = '@';
                        color = '#18181b'; 
                      } else if (cell.type === 'floor') {
                        color = '#cbd5e1'; 
                        char = '.';
                      } else if (cell.type === 'stairs') {
                        color = '#d97706'; 
                      } else if (cell.type === 'object') {
                        const found = objects.find(o => o.id === cell.id)?.found;
                        color = found ? '#16a34a' : '#dc2626'; 
                      } else if (cell.type === 'npc') {
                        color = '#7c3aed'; 
                      } else if (cell.type === 'fog' || cell.type === 'void') {
                        char = '\u00A0'; 
                      }

                      return (
                        <span 
                          key={cIndex} 
                          style={{ 
                            color, 
                            width: '15px', 
                            height: '15px', 
                            lineHeight: '15px', 
                            textAlign: 'center', 
                            display: 'inline-block', 
                            userSelect: 'none', 
                            fontWeight: cell.type === 'player' || cell.type === 'object' || cell.type === 'npc' ? 'bold' : 'normal',
                            border: '1px solid #d1d5db', 
                            boxSizing: 'border-box',
                            backgroundColor: '#e5e7eb'
                          }}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ステータスバッジリスト (マップのすぐ下へ移動) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
            {observerNpc && (
              <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #ddd6fe', backgroundColor: '#f5f3ff', color: '#6d28d9', fontWeight: 'bold' }}>
                👤 {observerNpc.name}
              </span>
            )}
            {objects.map(obj => (
              <span key={obj.id} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', backgroundColor: obj.found ? '#ecfdf5' : '#fef2f2', color: obj.found ? '#047857' : '#b91c1c', fontWeight: 'bold' }}>
                [{obj.id}] {obj.name}
              </span>
            ))}
          </div>

          {/* デバッグパネル (マップ下のステータスバッジの下へ移動) */}
          <div style={{ border: '1px dashed #d1d5db', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#f9fafb', fontSize: '11px', color: '#4b5563', flexShrink: 0, marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#374151' }}>[ DEBUG PANEL ]</h4>
            <div style={{ marginBottom: '4px' }}><strong>APIキー状況:</strong> {apiKeyInfo}</div>
            {debugLog ? (
              <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '4px 6px', borderRadius: '4px', border: '1px solid #fecaca', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                <strong>Error Log:</strong><br />{debugLog}
              </div>
            ) : (
              <div style={{ color: '#059669' }}>API連携は正常です。</div>
            )}
          </div>
        </div>

        {/* カラム2: システムタイムライン (中央・幅 360px 固定) */}
        <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* システム案内ログ（逆時系列） */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px', height: 'calc(100vh - 170px)', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', borderBottom: '1px solid #f3f4f6', paddingBottom: '4px', position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 1 }}>--- SYSTEM TIMELINE (LATEST ON TOP) ---</div>
            
            {/* エラー時再接続ボタン */}
            {isLoadError && (
              <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>⚠️ 接続エラーが発生しました。</span>
                <button 
                  onClick={handleRetry} 
                  style={{ padding: '6px 12px', fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                >
                  [ セクターに再接続 ]
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {systemLogs.map((log, idx) => {
                if (log.type === 'system') {
                  return (
                    <div key={idx} style={{ color: '#2563eb', fontSize: '12px', lineHeight: '1.4' }}>
                      ⚙️ [SYSTEM] {log.text}
                    </div>
                  );
                } else if (log.type === 'success') {
                  return (
                    <div key={idx} style={{ color: '#16a34a', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.4', padding: '6px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #d1fae5' }}>
                      🔓 [SYSTEM] {log.text}
                    </div>
                  );
                } else if (log.type === 'error') {
                  return (
                    <div key={idx} style={{ color: '#dc2626', fontSize: '12px', lineHeight: '1.4', padding: '6px', backgroundColor: '#fef2f2', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                      ⚠️ [SYSTEM ERROR] {log.text}
                    </div>
                  );
                } else if (log.type === 'npc_dialog') {
                  return (
                    <div key={idx} style={{ padding: '8px 10px', backgroundColor: '#faf5ff', borderLeft: '3px solid #7c3aed', borderRadius: '0 4px 4px 0', fontSize: '12.5px', color: '#5b21b6', lineHeight: '1.4' }}>
                      <strong style={{ fontSize: '11px', color: '#7c3aed' }}>💬 [{log.name}]:</strong><br />
                      {log.text}
                    </div>
                  );
                } else {
                  return (
                    <div key={idx} style={{ padding: '8px 10px', backgroundColor: '#f9fafb', borderLeft: '3px solid #3b82f6', borderRadius: '0 4px 4px 0', fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                      <strong style={{ fontSize: '11px', color: '#3b82f6' }}>[{log.name}] デコードデータ:</strong><br />
                      {log.text}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* カラム3: サルベージログ & デバッグ情報 (右端・残り幅すべて / flex: 1) */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '400px' }}>
          {/* サルベージログ */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px 25px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px', height: 'calc(100vh - 170px)', overflowY: 'auto' }}>
            <h3 style={{ margin: '0', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#6b7280', position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 1 }}>--- サルベージされた記憶の断片 (LOG) ---</h3>
            {recoveredTexts.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '13.5px', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                データ未回収。セクター内のオブジェクトを調査してください。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {recoveredTexts.map((item, index) => (
                  <div key={index} style={{ borderLeft: '2px solid #3b82f6', paddingLeft: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '2px' }}>
                      [{item.name}] (断片 {item.count}/{objects.length})
                    </div>
                    <p style={{ margin: 0, lineHeight: '1.55', fontSize: '13.5px', color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
