import fs from 'fs';
import { QUESTIONS_DB } from './src/utils/questions.js';

let csv = "id,category,type,question,answer,dummy1,dummy2,dummy3\n";

QUESTIONS_DB.forEach(q => {
  let dummy1 = "", dummy2 = "", dummy3 = "";
  if (q.type === 'choice' && q.choices) {
    const dummies = q.choices.filter(c => c !== q.answer);
    dummy1 = dummies[0] || "";
    dummy2 = dummies[1] || "";
    dummy3 = dummies[2] || "";
  }
  
  const escapeCSV = (str) => {
    if (str === undefined || str === null) return "";
    return `"${String(str).replace(/"/g, '""')}"`;
  };

  csv += `${q.id},${escapeCSV(q.category)},${escapeCSV(q.type)},${escapeCSV(q.question)},${escapeCSV(q.answer)},${escapeCSV(dummy1)},${escapeCSV(dummy2)},${escapeCSV(dummy3)}\n`;
});

// Write with BOM for Excel
fs.writeFileSync('default_questions.csv', '\uFEFF' + csv, 'utf8');
console.log("CSV exported successfully to default_questions.csv");
