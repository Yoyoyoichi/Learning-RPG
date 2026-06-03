const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. handleCardClick energy check
const handleCardRegex = /const handleCardClick = \(card\) => \{\s*if \(gameOver \|\| gameVictory \|\| !battle\) return;/;
if (handleCardRegex.test(content)) {
  content = content.replace(handleCardRegex, `const handleCardClick = (card) => {
    if (gameOver || gameVictory || !battle) return;
    if (battle.playerEnergy < card.cost) {
      addLog("エナジーが足りない！", 'system');
      return;
    }`);
}

// 2. energy deduction
const combatTurnRegex = /if \(isCorrectAnswer\) \{\s*addLog/;
if (combatTurnRegex.test(content)) {
  content = content.replace(combatTurnRegex, `if (isCorrectAnswer) {
        nextBattle.playerEnergy -= card.cost;
        addLog`);
}

// 3. UI: Hand Map
const handMapRegex = /\{hand\.map\(\(card\) => \{\s*const borderCol = card\.type === 'attack' \? '#ff3e3e' : '#3b82f6';/;
if (handMapRegex.test(content)) {
  content = content.replace(handMapRegex, `{hand.map((card, idx) => {
              const borderCol = card.type === 'attack' ? '#ff3e3e' : card.type === 'skill' ? '#3b82f6' : '#eab308';
              const canPlay = playerEnergy >= card.cost;`);
}

// 4. UI: Hand Button onClick and style
const oldButtonStyleStr = `<button
                  key={card.id}
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
                  
const newButtonStyleStr = `<button
                  key={card.id || idx}
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
                    textAlign: 'left',
                    transition: 'transform 0.15s',
                    opacity: canPlay ? 1 : 0.4,
                    boxShadow: canPlay ? \`0 0 6px \${borderCol}60\` : 'none',
                    cursor: canPlay ? 'pointer' : 'not-allowed',
                  }}`;
if (content.includes(oldButtonStyleStr)) {
  content = content.replace(oldButtonStyleStr, newButtonStyleStr);
}

// 5. UI: Cost indicator
const cardDescRegex = /<div style=\{\{ fontSize: '0.7rem', color: '#9ca3af'/g;
if (cardDescRegex.test(content)) {
  content = content.replace(cardDescRegex, `<span style={{ background: borderCol, color: '#000', fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', position: 'absolute', top: '-4px', right: '-4px' }}>{card.cost}</span>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af'`);
}

// 6. UI: Energy Bar
const endTurnRegex = /<div style=\{\{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '4px' \}\}>/;
if (endTurnRegex.test(content)) {
  content = content.replace(endTurnRegex, `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '8px', paddingBottom: '4px' }}>
            <div style={{ background: '#1e3a8a', color: '#93c5fd', fontWeight: 'bold', fontSize: '1.2rem', padding: '6px 16px', borderRadius: '8px', border: '2px solid #3b82f6', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
              ⚡ {playerEnergy} / {battle.playerMaxEnergy || 3}
            </div>`);
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
