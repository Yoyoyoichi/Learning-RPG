const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const oldButtonStr = `<button
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
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px', color: card.type === 'attack' ? '#fca5a5' : '#93c5fd' }}>
                        {card.name}
                      </span>
                    </div>
                    <span style={{ background: borderCol, color: '#000', fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', position: 'absolute', top: '-4px', right: '-4px' }}>{card.cost}</span>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.3', maxHeight: '65px', overflow: 'hidden', wordBreak: 'break-all' }}>
                      {card.desc}
                    </div>
                  </div>
                </button>`;
                
const newButtonStr = `<button
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
                    position: 'relative',
                    opacity: canPlay ? 1 : 0.4,
                    boxShadow: canPlay ? \`0 0 6px \${borderCol}60\` : 'none',
                    cursor: canPlay ? 'pointer' : 'not-allowed',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px', color: card.type === 'attack' ? '#fca5a5' : '#93c5fd' }}>
                        {card.name}
                      </span>
                    </div>
                    <span style={{ background: borderCol, color: '#000', fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', position: 'absolute', top: '-6px', right: '-6px', zIndex: 10, border: '1px solid #fff' }}>{card.cost}</span>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.3', maxHeight: '65px', overflow: 'hidden', wordBreak: 'break-all' }}>
                      {card.desc}
                    </div>
                  </div>
                </button>`;

if (content.includes(oldButtonStr)) {
  content = content.replace(oldButtonStr, newButtonStr);
} else {
  console.log("Could not find the exact old button string. Attempting regex replacement.");
  const buttonRegex = /<button[\s\S]*?onClick=\{\(\) => handleCardClick\(card\)\}[\s\S]*?<\/button>/;
  if (content.match(buttonRegex)) {
    content = content.replace(buttonRegex, newButtonStr);
    console.log("Regex replacement applied.");
  }
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
