// 学習記録（正答率・回答日）を管理するユーティリティ
import { QUESTIONS_DB, getCustomQuestions } from './questions';

const STATS_KEY = 'learning_rpg_stats';

export const loadStats = () => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Stats loading failed", e);
    return {};
  }
};

export const saveStats = (statsObj) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(statsObj));
  } catch (e) {
    console.error("Stats saving failed", e);
  }
};

export const recordAnswer = (questionId, isCorrect) => {
  const stats = loadStats();
  
  if (!stats[questionId]) {
    stats[questionId] = { correct: 0, incorrect: 0, lastAnswered: null };
  }
  
  if (isCorrect) {
    stats[questionId].correct += 1;
  } else {
    stats[questionId].incorrect += 1;
  }
  
  stats[questionId].lastAnswered = new Date().toISOString();
  
  saveStats(stats);
};

export const getStatsForQuestion = (questionId) => {
  const stats = loadStats();
  return stats[questionId] || { correct: 0, incorrect: 0, lastAnswered: null };
};

export const clearStats = () => {
  localStorage.removeItem(STATS_KEY);
};

export const exportStatsToCSV = () => {
  const stats = loadStats();
  const allQuestions = [...QUESTIONS_DB, ...getCustomQuestions()];
  
  // Create CSV header
  let csvContent = "ID,カテゴリ,問題文,正解,正解数,不正解数,正答率,最終回答日\n";
  
  // Add rows
  allQuestions.forEach(q => {
    const s = stats[q.id];
    if (s) {
      const total = s.correct + s.incorrect;
      const rate = total > 0 ? Math.round((s.correct / total) * 100) : 0;
      const lastDate = s.lastAnswered ? new Date(s.lastAnswered).toLocaleString() : '';
      
      // Escape quotes and commas in strings
      const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
      
      csvContent += `${q.id},${escapeCSV(q.category)},${escapeCSV(q.question)},${escapeCSV(q.answer)},${s.correct},${s.incorrect},${rate}%,${escapeCSV(lastDate)}\n`;
    }
  });
  
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learning_rpg_stats_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
