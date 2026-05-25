import React, { useState } from 'react';
import Papa from 'papaparse';
import './WordListPanel.css';

const WordListPanel = ({ learnedWords, customWordsCount, onImportCustomWords, onClearCustomWords }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'review', 'correct'
  const [searchQuery, setSearchQuery] = useState('');

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let parsed = [];
        if (results.data && results.data.length > 0) {
          const firstRow = results.data[0];
          const keys = Object.keys(firstRow);
          
          // Identify keys dynamically
          const englishKey = keys.find(k => 
            k.toLowerCase().includes('word') || 
            k.toLowerCase().includes('english') || 
            k.toLowerCase() === 'en' || 
            k.toLowerCase() === 'eng'
          );
          
          const japaneseKey = keys.find(k => 
            k.toLowerCase().includes('meaning') || 
            k.toLowerCase().includes('japanese') || 
            k.toLowerCase() === 'ja' || 
            k.toLowerCase() === 'jp' || 
            k.toLowerCase() === 'jpn'
          );

          if (englishKey && japaneseKey) {
            parsed = results.data.map(row => ({
              word: row[englishKey] ? row[englishKey].trim() : '',
              meaning: row[japaneseKey] ? row[japaneseKey].trim() : ''
            })).filter(r => r.word && r.meaning);
          }
        }

        if (parsed.length > 0) {
          onImportCustomWords(parsed);
          e.target.value = ''; // Reset file input
        } else {
          // If header-based parsing yields nothing, fallback to parsing without headers (index-based)
          parseHeaderless(file, e);
        }
      },
      error: (err) => {
        alert("ファイルのロードに失敗しました: " + err.message);
      }
    });
  };

  const parseHeaderless = (file, e) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map(row => {
          if (row.length >= 2) {
            return {
              word: row[0] ? row[0].trim() : '',
              meaning: row[1] ? row[1].trim() : ''
            };
          }
          return null;
        }).filter(r => r && r.word && r.meaning);

        if (parsed.length > 0) {
          onImportCustomWords(parsed);
        } else {
          alert("CSVファイルの読み込みに失敗しました。英語と日本語の2列で構成されているか、ヘッダーに 'word' と 'meaning' を指定してください。");
        }
        e.target.value = ''; // Reset input
      }
    });
  };

  // Convert map/object of learned words to array for filtering & listing
  const wordsArray = Object.keys(learnedWords).map(key => ({
    word: key,
    ...learnedWords[key]
  }));

  // Filtering and Searching
  const filteredWords = wordsArray.filter(item => {
    // 1. Filter by category
    if (filter === 'review' && !item.isReview) return false;
    if (filter === 'correct' && item.incorrectCount > 0) return false;

    // 2. Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.word.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate statistics
  const totalEncountered = wordsArray.length;
  const totalCorrect = wordsArray.reduce((acc, curr) => acc + (curr.correctCount > 0 ? 1 : 0), 0);
  const totalReview = wordsArray.filter(w => w.isReview).length;

  return (
    <div className="panel word-list-panel">
      <div className="panel-title">
        <span>単語帳 & 学習ログ</span>
        <span className="words-stat-counter">{totalCorrect} / {totalEncountered} 習得</span>
      </div>

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
      <div className="word-table-container">
        {filteredWords.length === 0 ? (
          <div className="empty-table-msg">
            {searchQuery || filter !== 'all' ? '該当する単語はありません' : '戦闘で出現した単語がここに記録されます'}
          </div>
        ) : (
          <table className="word-table">
            <thead>
              <tr>
                <th>英単語</th>
                <th>意味</th>
                <th style={{ textAlign: 'center' }}>正誤</th>
                <th style={{ textAlign: 'center' }}>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((item) => (
                <tr key={item.word} className={item.isReview ? 'review-row' : ''}>
                  <td className="table-word">{item.word}</td>
                  <td className="table-meaning">{item.meaning}</td>
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
    </div>
  );
};

export default WordListPanel;
