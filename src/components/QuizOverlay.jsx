import React, { useState, useEffect, useRef } from 'react';
import { generateHiddenWordHint } from '../utils/words';
import { playCorrectSound, playIncorrectSound } from '../utils/sound';
import './QuizOverlay.css';

const QuizOverlay = ({ wordObj, onCorrect, onIncorrect }) => {
  const [inputValue, setInputValue] = useState('');
  const [hintLevel, setHintLevel] = useState(0); // 0: No structural hint, 1: Show first char, 2: Show first & last

  const inputRef = useRef(null);

  // Auto-focus on input mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const answer = inputValue.trim().toLowerCase();
    const correctSpelling = wordObj.word.trim().toLowerCase();

    if (answer === correctSpelling) {
      playCorrectSound();
      onCorrect();
    } else {
      playIncorrectSound();
      onIncorrect();
    }
  };

  const toggleHint = () => {
    if (hintLevel < 2) {
      setHintLevel(prev => prev + 1);
    }
  };

  // Generate the structural hint (e.g. "c _ _ _ t" for "chest")
  const structuralHint = generateHiddenWordHint(wordObj.word, hintLevel);

  return (
    <div className="quiz-box retro-panel">
      <div className="quiz-header">
        <span className="quiz-tag blinking-text">BATTLE QUIZ</span>
        <span className="quiz-stats-small">Word Length: {wordObj.word.length} letters</span>
      </div>

      <div className="quiz-question-section">
        <p className="question-label">【和訳】</p>
        <h2 className="question-text">{wordObj.meaning}</h2>

        {hintLevel > 0 && (
          <div className="hint-display">
            <span className="hint-label">HINT:</span>
            <span className="hint-letters">{structuralHint}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="quiz-form">
        <div className="input-container">
          <span className="prompt-arrow">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="quiz-input"
            placeholder="英単語を入力してください..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        <div className="quiz-buttons">
          <button
            type="button"
            className="quiz-btn hint-btn"
            onClick={toggleHint}
            disabled={hintLevel >= 2}
          >
            {hintLevel === 0 ? 'ヒントを表示' : hintLevel === 1 ? 'さらにヒント' : 'ヒント終了'}
          </button>
          <button type="submit" className="quiz-btn submit-btn" disabled={!inputValue.trim()}>
            決定 (ENTER)
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizOverlay;
