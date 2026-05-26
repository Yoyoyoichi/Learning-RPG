const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Update card UI in hand to show cost
const oldCardUI = `                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px', color: card.type === 'attack' ? '#fca5a5' : '#93c5fd' }}>
                        {card.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.3', maxHeight: '65px', overflow: 'hidden', wordBreak: 'break-all' }}>
                      {card.desc}`;

const newCardUI = `                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px', color: card.type === 'attack' ? '#fca5a5' : '#93c5fd' }}>
                        {card.name}
                      </span>
                      <span style={{
                        background: borderCol,
                        color: '#000',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem'
                      }}>
                        {card.cost}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af', lineHeight: '1.3', maxHeight: '65px', overflow: 'hidden', wordBreak: 'break-all' }}>
                      {card.desc}`;

if (content.includes(oldCardUI)) {
  content = content.replace(oldCardUI, newCardUI);
} else {
  console.log("Could not find oldCardUI chunk");
}

// Update Energy display UI
const oldEnergyUI = `          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '4px' }}>
            <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1rem', textShadow: '0 0 5px #3b82f6', paddingLeft: '8px' }}>
              ⚡ エナジー: {playerEnergy} / {battle.playerMaxEnergy}
            </div>
            <button
              onClick={handleEndTurn}`;

const newEnergyUI = `          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: '8px', paddingBottom: '4px' }}>
            <div style={{ 
              background: '#1e3a8a', 
              color: '#93c5fd', 
              fontWeight: 'bold', 
              fontSize: '1.2rem', 
              padding: '6px 16px', 
              borderRadius: '8px', 
              border: '2px solid #3b82f6',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
            }}>
              ⚡ {playerEnergy} / {battle.playerMaxEnergy}
            </div>
            <button
              onClick={handleEndTurn}`;

if (content.includes(oldEnergyUI)) {
  content = content.replace(oldEnergyUI, newEnergyUI);
} else {
  console.log("Could not find oldEnergyUI chunk");
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
