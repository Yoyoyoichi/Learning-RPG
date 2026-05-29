import { useState } from 'react';
import './WordListPanel.css';

const WordListPanel = ({ learnedWords, customWordsCount, onImportCustomWords, onClearCustomWords, deck = [] }) => {
  const [activeTab, setActiveTab] = useState('words'); // 'words' or 'deck'
  const [filter, setFilter] = useState('all'); // 'all', 'review', 'correct'
  const [searchQuery, setSearchQuery] = useState('');

  // Handle CSV file upload by passing to parent
  const handleFileUpload = (e) => {
    if (onImportCustomWords) {
      onImportCustomWords(e);
    }
  };

  // Convert map/object of learned words to array for filtering & listing
  const wordsArray = Object.keys(learnedWords).map(key => ({
    id: key,
    question: learnedWords[key].question || key,
    answer: learnedWords[key].answer || '',
    category: learnedWords[key].category || '',
    type: learnedWords[key].type || 'choice',
    ...learnedWords[key]
  }));

  // Filtering and Searching
  const filteredWords = wordsArray.filter(item => {
    if (filter === 'review' && !item.isReview) return false;
    if (filter === 'correct' && item.incorrectCount > 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (item.question || '').toLowerCase().includes(q) ||
        (item.answer || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate statistics
  const totalReview = wordsArray.filter(w => w.isReview).length;

  return (
    <div className="panel word-list-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs header */}
      <div className="panel-tabs-sub" style={{ display: 'flex', borderBottom: '1px solid #27272a', marginBottom: '8px' }}>
        <button 
          className={`panel-tab-btn-sub ${activeTab === 'words' ? 'active' : ''}`}
          onClick={() => setActiveTab('words')}
          style={{
            flex: 1,
            background: activeTab === 'words' ? '#f3f4f6' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'words' ? '2px solid #059669' : 'none',
            color: activeTab === 'words' ? '#059669' : '#4b5563',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}
        >
          📖 単語帳 & 設定
        </button>
        <button 
          className={`panel-tab-btn-sub ${activeTab === 'deck' ? 'active' : ''}`}
          onClick={() => setActiveTab('deck')}
          style={{
            flex: 1,
            background: activeTab === 'deck' ? '#f3f4f6' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'deck' ? '2px solid #dc2626' : 'none',
            color: activeTab === 'deck' ? '#dc2626' : '#4b5563',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}
        >
          🃏 所持デッキ ({deck.length}枚)
        </button>
      </div>

      {activeTab === 'words' && (
        <>
          {/* CSV Import Controls */}
          <div className="csv-controls">
            {customWordsCount > 0 ? (
              <div className="custom-words-indicator">
                <span className="indicator-text">📁 カスタム単語: {customWordsCount}語ロード中</span>
                <button className="clear-csv-btn" onClick={onClearCustomWords}>デフォルトに戻す</button>
              </div>
            ) : (
              <div className="csv-upload-btn-wrapper">
                <span className="csv-btn-label">CSV単語リストをロード</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="csv-file-input" 
                />
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="word-filters">
            <input 
              type="text" 
              placeholder="単語または意味で検索..." 
              className="search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                すべて
              </button>
              <button 
                className={`filter-btn ${filter === 'review' ? 'active' : ''}`}
                onClick={() => setFilter('review')}
              >
                要復習 ({totalReview})
              </button>
            </div>
          </div>

          {/* Word List Table */}
          <div className="word-table-container" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredWords.length === 0 ? (
              <div className="empty-table-msg">
                {searchQuery || filter !== 'all' ? '該当する問題はありません' : '戦闘でといた問題がここに記録されます'}
              </div>
            ) : (
              <table className="word-table">
                <thead>
                  <tr>
                    <th>カテゴリ</th>
                    <th>問題</th>
                    <th>正解</th>
                    <th style={{ textAlign: 'center' }}>正誤</th>
                    <th style={{ textAlign: 'center' }}>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWords.map((item) => (
                    <tr key={item.id} className={item.isReview ? 'review-row' : ''}>
                      <td className="table-meaning" style={{ whiteSpace: 'nowrap', color: '#a78bfa', fontSize: '0.72rem' }}>
                        {item.type === 'input' ? '🔤' : '🗾'} {item.category}
                      </td>
                      <td className="table-meaning" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.question}
                      </td>
                      <td className="table-word" style={{ fontWeight: 'bold', color: '#fbbf24' }}>
                        {item.answer}
                      </td>
                      <td className="table-stats" style={{ textAlign: 'center' }}>
                        <span className="stats-ok">{item.correctCount}</span>
                        <span className="stats-divider">/</span>
                        <span className="stats-ng">{item.incorrectCount}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.isReview ? (
                          <span className="badge review-badge">要復習</span>
                        ) : (
                          <span className="badge learned-badge">マスター</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'deck' && (
        <div className="deck-list-container" style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            {deck.map((card, idx) => {
              const borderCol = card.type === 'attack' ? '#ff3e3e' : '#3b82f6';
              return (
                <div 
                  key={card.id || idx} 
                  className={`deck-card-item ${card.type}`} 
                  style={{
                    border: `1px solid ${borderCol}`,
                    borderRadius: '6px',
                    padding: '8px',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '90px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: card.type === 'attack' ? '#dc2626' : '#0284c7',
                        fontSize: '0.78rem'
                      }}>
                        {card.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#a1a1aa', lineBreak: 'anywhere' }}>
                      {card.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WordListPanel;
