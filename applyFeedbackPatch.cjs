const fs = require('fs');

// --- 1. Patch App.jsx for immediate energy deduction ---
let appContent = fs.readFileSync('src/App.jsx', 'utf8');

// First, remove energy deduction from resolveCombatTurn
const oldCombatTurn = `    if (type === 'card') {
      if (isCorrectAnswer) {
        nextBattle.playerEnergy -= card.cost;
        addLog`;
const newCombatTurn = `    if (type === 'card') {
      if (isCorrectAnswer) {
        addLog`;

if (appContent.includes(oldCombatTurn)) {
  appContent = appContent.replace(oldCombatTurn, newCombatTurn);
}

// Next, add immediate energy deduction in handleCardClick
const oldHandleCardClick = `  const handleCardClick = (card) => {
    if (gameOver || gameVictory || !battle) return;
    if (battle.playerEnergy < card.cost) {
      addLog("エナジーが足りない！", 'system');
      return;
    }`;
const newHandleCardClick = `  const handleCardClick = (card) => {
    if (gameOver || gameVictory || !battle) return;
    if (battle.playerEnergy < card.cost) {
      addLog("エナジーが足りない！", 'system');
      return;
    }
    
    // エナジーを即座に消費
    setBattle(prev => ({ ...prev, playerEnergy: prev.playerEnergy - card.cost }));`;

if (appContent.includes(oldHandleCardClick)) {
  appContent = appContent.replace(oldHandleCardClick, newHandleCardClick);
}

fs.writeFileSync('src/App.jsx', appContent, 'utf8');

// --- 2. Patch QuizOverlay.jsx for Auto-Submit ---
let quizContent = fs.readFileSync('src/components/QuizOverlay.jsx', 'utf8');

const oldUseEffect = `  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);`;

const newUseEffect = `  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 正解が入力されたら自動でSubmitする
  useEffect(() => {
    if (inputValue.trim() && !answered) {
      if (checkAnswer(inputValue, questionObj)) {
        handleSubmit();
      }
    }
  }, [inputValue]);`;

if (quizContent.includes(oldUseEffect)) {
  quizContent = quizContent.replace(oldUseEffect, newUseEffect);
}

fs.writeFileSync('src/components/QuizOverlay.jsx', quizContent, 'utf8');

console.log("Patches applied successfully.");
