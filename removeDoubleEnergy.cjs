const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// The line is: nextBattle.playerEnergy -= card.cost;
// It is inside resolveCombatTurn, inside `if (isCorrectAnswer) {`

const oldBlock = `    if (type === 'card') {
      if (isCorrectAnswer) {
        nextBattle.playerEnergy -= card.cost;
        addLog(\`【せいかい！】「\${card.name}」をつかった！ (\${activeQuiz.questionObj.category})\`, 'system');
        playHitSound();`;
        
const newBlock = `    if (type === 'card') {
      if (isCorrectAnswer) {
        addLog(\`【せいかい！】「\${card.name}」をつかった！ (\${activeQuiz.questionObj.category})\`, 'system');
        playHitSound();`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
} else {
    console.log("Could not find the block as a simple string. Using regex.");
    const regex = /if \(type === 'card'\) \{\s*if \(isCorrectAnswer\) \{\s*nextBattle\.playerEnergy -= card\.cost;\s*/;
    content = content.replace(regex, "if (type === 'card') {\n      if (isCorrectAnswer) {\n        ");
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
