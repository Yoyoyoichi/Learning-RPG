// 学習記録（正答率・回答日）を管理するユーティリティ

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
