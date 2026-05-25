import React, { useState, useEffect, useRef } from 'react';
import { checkAnswer } from '../utils/questions';
import { recordAnswer } from '../utils/stats';
import { playCorrectSound, playIncorrectSound } from '../utils/sound';
import './QuizOverlay.css';

const CATEGORY_ICONS = {
  "県庁所在地": "🗾",
  "夏の星座": "⭐",
  "冬の星座": "❄️",
  "北の星座": "🧭",
  "月の動き": "🌙",
  "天体の動き": "🪐",
  "太陽の動き": "☀️",
  "天気": "🌤️",
  "算数単位": "📐",
  "算数計算": "🔢",
  "国語慣用句": "📖",
  "国語画数": "✏️",
  "英語カタカナ": "🔤",
};

// =====================
// 4択モード
// =====================
const ChoiceQuiz = ({ questionObj, onCorrect, onIncorrect }) => {
  const [answered, setAnswered] = useState(null); // null | { selected, isCorrect }

  const handleClick = (choice) => {
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
  };

  const getButtonStyle = (choice) => {
    const base = {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      fontFamily: 'inherit',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      cursor: answered ? 'default' : 'pointer',
      border: '2px solid',
      transition: 'all 0.2s',
      textAlign: 'left',
      lineHeight: '1.3',
    };

    if (!answered) {
      return { ...base, background: '#18181b', borderColor: '#3f3f46', color: '#e4e4e7' };
    }
    if (choice === questionObj.answer) {
      return { ...base, background: 'rgba(0,255,102,0.15)', borderColor: '#00ff66', color: '#00ff66' };
    }
    if (answered.selected === choice) {
      return { ...base, background: 'rgba(255,59,48,0.15)', borderColor: '#ff3b30', color: '#ff3b30' };
    }
    return { ...base, background: '#0d0d0f', borderColor: '#27272a', color: '#52525b' };
  };

  const icon = CATEGORY_ICONS[questionObj.category] || '❓';

  return (
    <div className={`quiz-box retro-panel ${answered ? (answered.isCorrect ? 'correct-glow' : 'incorrect-glow shake') : ''}`}>
      <div className="quiz-header">
        <span className="quiz-tag blinking-text">BATTLE QUIZ</span>
        <span style={{ color: '#a78bfa', fontSize: '0.72rem', fontWeight: 'bold' }}>
          {icon} {questionObj.category}
        </span>
      </div>

      <div style={{ padding: '8px 0 6px' }}>
        <p style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 'bold', margin: 0, lineHeight: '1.5' }}>
          {questionObj.question}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {questionObj.shuffledChoices.map((choice, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(choice)}
            style={getButtonStyle(choice)}
            onMouseEnter={(e) => {
              if (!answered) e.currentTarget.style.borderColor = '#a78bfa';
            }}
            onMouseLeave={(e) => {
              if (!answered) e.currentTarget.style.borderColor = '#3f3f46';
            }}
          >
            <span style={{ color: '#71717a', marginRight: '6px', fontSize: '0.72rem' }}>
              {['①', '②', '③', '④'][idx]}
            </span>
            {choice}
          </button>
        ))}
      </div>

      {answered && (
        <div className={`quiz-result-message ${answered.isCorrect ? 'msg-correct' : 'msg-incorrect'}`}>
          {answered.isCorrect
            ? '⭕ せいかい！ すばらしい！'
            : `❌ ざんねん！ せいかいは「${questionObj.answer}」だよ`
          }
        </div>
      )}
    </div>
  );
};

// =====================
// 入力モード（カタカナ / 数字 両対応）
// =====================
const InputQuiz = ({ questionObj, onCorrect, onIncorrect }) => {
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(null); // null | { isCorrect }
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const isMath = questionObj.category === '算数計算';
  const isKatakana = questionObj.category === '英語カタカナ';

  const handleSubmit = (e) => {
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
  };

  const icon = CATEGORY_ICONS[questionObj.category] || '🔤';
  const tagColor = isKatakana ? '#fb923c' : isMath ? '#34d399' : '#60a5fa';

  // ヒント表示（カタカナ問題は最初の文字、算数は不要）
  const hintText = questionObj.hint || null;

  return (
    <div className={`quiz-box retro-panel ${answered ? (answered.isCorrect ? 'correct-glow' : 'incorrect-glow shake') : ''}`}>
      <div className="quiz-header">
        <span className="quiz-tag blinking-text">BATTLE QUIZ</span>
        <span style={{ color: tagColor, fontSize: '0.72rem', fontWeight: 'bold' }}>
          {icon} {questionObj.category}
        </span>
      </div>

      <div style={{ padding: '6px 0 4px' }}>
        <p style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 'bold', margin: 0, lineHeight: '1.5' }}>
          {questionObj.question}
        </p>

        {/* ヒント */}
        {isKatakana && (
          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showHint && hintText ? (
              <div className="hint-display">
                <span className="hint-label">ヒント:</span>
                <span className="hint-letters">最初の文字は「{hintText}」</span>
              </div>
            ) : (
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: '1px solid #ffb300',
                  color: '#ffb300',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onClick={() => setShowHint(true)}
                disabled={!!answered}
              >
                ヒントを見る
              </button>
            )}
          </div>
        )}

        {/* 答えの文字数 */}
        {isKatakana && (
          <p style={{ color: '#52525b', fontSize: '0.68rem', margin: '3px 0 0' }}>
            文字数: {questionObj.answer.length}文字
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="quiz-form">
        <div className="input-container" style={{ opacity: answered ? 0.6 : 1 }}>
          <span className="prompt-arrow">&gt;</span>
          <input
            ref={inputRef}
            type={isMath ? 'text' : 'text'}
            inputMode={isMath ? 'decimal' : 'text'}
            className="quiz-input"
            placeholder={
              isMath
                ? '数字を入力してね...'
                : isKatakana
                ? 'カタカナで入力してね（例: キャット）'
                : '答えを入力してね...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!!answered}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        <div className="quiz-buttons">
          <button
            type="submit"
            className="quiz-btn submit-btn"
            disabled={!inputValue.trim() || !!answered}
            style={{ flex: 1 }}
          >
            {isMath ? '決定 (ENTER)' : 'こたえる (ENTER)'}
          </button>
        </div>
      </form>

      {answered && (
        <div className={`quiz-result-message ${answered.isCorrect ? 'msg-correct' : 'msg-incorrect'}`}>
          {answered.isCorrect
            ? `⭕ せいかい！「${questionObj.answer}」だね！`
            : `❌ ざんねん！ せいかいは「${questionObj.answer}」だよ`
          }
        </div>
      )}
    </div>
  );
};

// =====================
// メインコンポーネント
// =====================
const QuizOverlay = ({ questionObj, onCorrect, onIncorrect }) => {
  if (!questionObj) return null;

  if (questionObj.type === 'choice') {
    return (
      <ChoiceQuiz
        questionObj={questionObj}
        onCorrect={onCorrect}
        onIncorrect={onIncorrect}
      />
    );
  }

  return (
    <InputQuiz
      questionObj={questionObj}
      onCorrect={onCorrect}
      onIncorrect={onIncorrect}
    />
  );
};

export default QuizOverlay;
