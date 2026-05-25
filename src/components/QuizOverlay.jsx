import React, { useState, useEffect, useRef } from 'react';
import { generateHiddenWordHint } from '../utils/words';
import { playCorrectSound, playIncorrectSound } from '../utils/sound';
import './QuizOverlay.css';

const QuizOverlay = ({ wordObj, onCorrect, onIncorrect }) => {
  const [inputValue, setInputValue] = useState('');
  const [hintLevel, setHintLevel] = useState(0); // 0: No structural hint, 1: Show first char, 2: Show first & last
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRef = useRef(null);
  const nextBtnRef = useRef(null);

  // Auto-focus on input mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle enter key to submit or continue
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (!isAnswered) {
          handleSubmit(e);
        } else {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputValue, isAnswered, isCorrect]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const answer = inputValue.trim().toLowerCase();
    const correctSpelling = wordObj.word.trim().toLowerCase();

    if (answer === correctSpelling) {
      setIsCorrect(true);
      setIsAnswered(true);
      playCorrectSound();
    } else {
      setIsCorrect(false);
      setIsAnswered(true);
      setShake(true);
      playIncorrectSound();
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleNext = () => {
    if (isCorrect) {
      onCorrect();
    } else {
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
    <div className={`quiz-box retro-panel ${shake ? 'shake' : ''} ${isAnswered ? (isCorrect ? 'correct-glow' : 'incorrect-glow') : ''}`}>
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
            disabled={isAnswered}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        <div className="quiz-buttons">
          {!isAnswered ? (
            <>
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
            </>
          ) : (
            <button
              ref={nextBtnRef}
              type="button"
              className={`quiz-btn next-btn ${isCorrect ? 'btn-correct' : 'btn-incorrect'}`}
              onClick={handleNext}
            >
              {isCorrect ? '攻撃開始！' : '大打撃を受ける...'} (ENTER)
            </button>
          )}
        </div>
      </form>

      {isAnswered && (
        <div className={`quiz-result-message ${isCorrect ? 'msg-correct' : 'msg-incorrect'}`}>
          {isCorrect ? (
            <div className="result-animation">
              <span className="result-symbol">✓</span>
              <span>正解！素晴らしいスペルです！</span>
            </div>
          ) : (
            <div className="result-animation">
              <span className="result-symbol">✗</span>
              <span>不正解... 正解は: <strong>{wordObj.word}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizOverlay;
