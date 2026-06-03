const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. handleCardClick modification
const oldHandleCardClick = `  const handleCardClick = (card) => {
    if (gameOver || gameVictory || !battle) return;`;

const newHandleCardClick = `  const handleCardClick = (card) => {
    if (gameOver || gameVictory || !battle) return;
    if (battle.playerEnergy < card.cost) {
      addLog("エナジーが足りない！", 'system');
      return;
    }`;

content = content.replace(oldHandleCardClick, newHandleCardClick);

// 2. resolveCombatTurn modification
const oldResolveCombatTurnCorrect = `      if (isCorrectAnswer) {
        addLog(\`クイズ正解！ \${card.name} を発動した！\`, 'system');`;

const newResolveCombatTurnCorrect = `      if (isCorrectAnswer) {
        nextBattle.playerEnergy -= card.cost;
        addLog(\`クイズ正解！ \${card.name} を発動した！\`, 'system');`;

content = content.replace(oldResolveCombatTurnCorrect, newResolveCombatTurnCorrect);

// 3. UI Hand modification
const oldHandMap = `            {hand.map((card, idx) => {
              const borderCol = card.type === 'attack' ? '#ff3e3e' : card.type === 'skill' ? '#3b82f6' : '#eab308';
              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(card)}
                  style={{
                    flex: '0 0 92px',
                    height: '110px',
                    border: \`1px solid \${borderCol}\`,
                    borderRadius: '4px',
                    background: '#040405',
                    color: '#f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: \`0 0 6px \${borderCol}60\`,
                    transition: 'transform 0.15s',
                  }}`;

const newHandMap = `            {hand.map((card, idx) => {
              const borderCol = card.type === 'attack' ? '#ff3e3e' : card.type === 'skill' ? '#3b82f6' : '#eab308';
              const canPlay = playerEnergy >= card.cost;
              return (
                <button
                  key={idx}
                  onClick={() => canPlay ? handleCardClick(card) : null}
                  disabled={!canPlay}
                  style={{
                    flex: '0 0 92px',
                    height: '110px',
                    border: \`1px solid \${borderCol}\`,
                    borderRadius: '4px',
                    background: '#040405',
                    color: '#f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '5px',
                    cursor: canPlay ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    boxShadow: canPlay ? \`0 0 6px \${borderCol}60\` : 'none',
                    transition: 'transform 0.15s',
                    opacity: canPlay ? 1 : 0.4,
                  }}`;

content = content.replace(oldHandMap, newHandMap);

// 4. UI Energy Display
const oldEndTurnBar = `          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '4px' }}>
            <button
              onClick={handleEndTurn}`;

const newEndTurnBar = `          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '4px' }}>
            <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1rem', textShadow: '0 0 5px #3b82f6', paddingLeft: '8px' }}>
              ⚡ エナジー: {playerEnergy} / {battle.playerMaxEnergy}
            </div>
            <button
              onClick={handleEndTurn}`;

content = content.replace(oldEndTurnBar, newEndTurnBar);

fs.writeFileSync('src/App.jsx', content, 'utf8');
