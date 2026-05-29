import fs from 'fs';

let content = fs.readFileSync('src/components/QuizOverlay.jsx', 'utf-8');

// 1. Add handleNext to ChoiceQuiz
content = content.replace(
  `const handleClick = useCallback((choice) => {
    if (answered) return;
    const isCorrect = choice === questionObj.answer;
    setAnswered({ selected: choice, isCorrect });
    recordAnswer(questionObj.id, isCorrect);
    
    if (isCorrect) {
      playCorrectSound();
      setTimeout(() => onCorrect(), 900);
    } else {
      playIncorrectSound();
      setTimeout(() => onIncorrect(), 1400);
    }
  }, [answered, questionObj, onCorrect, onIncorrect]);`,
  `const handleClick = useCallback((choice) => {
    if (answered) return;
    const isCorrect = choice === questionObj.answer;
    setAnswered({ selected: choice, isCorrect });
    recordAnswer(questionObj.id, isCorrect);
    
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  }, [answered, questionObj]);

  const handleNext = useCallback(() => {
    if (!answered) return;
    if (answered.isCorrect) onCorrect();
    else onIncorrect();
  }, [answered, onCorrect, onIncorrect]);`
);

// 2. Add handleNext to handleKeyDown (ChoiceQuiz)
content = content.replace(
  `  useEffect(() => {
    const handleKeyDown = (e) => {
      if (answered) return;`,
  `  useEffect(() => {
    const handleKeyDown = (e) => {
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
        return;
      }`
);
content = content.replace(
  `window.removeEventListener('keydown', handleKeyDown);
  }, [answered, selectedIndex, questionObj, handleClick]);`,
  `window.removeEventListener('keydown', handleKeyDown);
  }, [answered, selectedIndex, questionObj, handleClick, handleNext]);`
);

// 3. Add explanation to ChoiceQuiz result
content = content.replace(
  `      {answered && (
        <div className={\`quiz-result-message \${answered.isCorrect ? 'msg-correct' : 'msg-incorrect'}\`}>
          {answered.isCorrect
            ? '⭕ せいかい！ すばらしい！'
            : \`❌ ざんねん！ せいかいは「\${questionObj.answer}」だよ\`
          }
        </div>
      )}`,
  `      {answered && (
        <div style={{ marginTop: '10px' }}>
          <div className={\`quiz-result-message \${answered.isCorrect ? 'msg-correct' : 'msg-incorrect'}\`}>
            {answered.isCorrect
              ? '⭕ せいかい！ すばらしい！'
              : \`❌ ざんねん！ せいかいは「\${questionObj.answer}」だよ\`
            }
          </div>
          {questionObj.explanation && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #3f3f46', borderRadius: '6px', padding: '10px', marginTop: '8px', fontSize: '0.85rem', color: '#e4e4e7', lineHeight: '1.4' }} className="explanation-box">
              <strong style={{ color: '#60a5fa' }}>💡 解説:</strong><br/>
              {questionObj.explanation}
            </div>
          )}
          <button 
            className="quiz-btn submit-btn" 
            style={{ width: '100%', marginTop: '10px', padding: '10px' }} 
            onClick={handleNext}
          >
            次へ進む (Enter)
          </button>
        </div>
      )}`
);

// 4. Update handleSubmit for InputQuiz
content = content.replace(
  `  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || answered) return;

    const isCorrect = checkAnswer(inputValue, questionObj);
    setAnswered({ isCorrect });
    recordAnswer(questionObj.id, isCorrect);

    if (isCorrect) {
      playCorrectSound();
      setTimeout(() => onCorrect(), 900);
    } else {
      playIncorrectSound();
      setTimeout(() => onIncorrect(), 1400);
    }
  };`,
  `  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (answered) {
      if (answered.isCorrect) onCorrect();
      else onIncorrect();
      return;
    }
    if (!inputValue.trim()) return;

    const isCorrect = checkAnswer(inputValue, questionObj);
    setAnswered({ isCorrect });
    recordAnswer(questionObj.id, isCorrect);

    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  };`
);

// 5. Add explanation to InputQuiz
content = content.replace(
  `      {answered && (
        <div className={\`quiz-result-message \${answered.isCorrect ? 'msg-correct' : 'msg-incorrect'}\`}>
          {answered.isCorrect
            ? \`⭕ せいかい！「\${questionObj.answer}」だね！\`
            : \`❌ ざんねん！ せいかいは「\${questionObj.answer}」だよ\`
          }
        </div>
      )}`,
  `      {answered && (
        <div style={{ marginTop: '10px' }}>
          <div className={\`quiz-result-message \${answered.isCorrect ? 'msg-correct' : 'msg-incorrect'}\`}>
            {answered.isCorrect
              ? \`⭕ せいかい！「\${questionObj.answer}」だね！\`
              : \`❌ ざんねん！ せいかいは「\${questionObj.answer}」だよ\`
            }
          </div>
          {questionObj.explanation && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #3f3f46', borderRadius: '6px', padding: '10px', marginTop: '8px', fontSize: '0.85rem', color: '#e4e4e7', lineHeight: '1.4' }} className="explanation-box">
              <strong style={{ color: '#60a5fa' }}>💡 解説:</strong><br/>
              {questionObj.explanation}
            </div>
          )}
          <button 
            type="button"
            className="quiz-btn submit-btn" 
            style={{ width: '100%', marginTop: '10px', padding: '10px' }} 
            onClick={() => answered.isCorrect ? onCorrect() : onIncorrect()}
          >
            次へ進む (Enter)
          </button>
        </div>
      )}`
);

fs.writeFileSync('src/components/QuizOverlay.jsx', content, 'utf-8');

console.log('Update complete');
