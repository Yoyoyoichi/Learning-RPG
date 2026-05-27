const fs = require('fs');

let css = fs.readFileSync('src/App.css', 'utf8');

const replacements = {
  '#09090b': '#f3f4f6',
  '#18181b': '#ffffff',
  '#27272a': '#d1d5db',
  '#040405': '#f9fafb',
  '#1c1917': '#f3f4f6',
  'rgba(0, 0, 0, 0.85)': 'rgba(255, 255, 255, 0.95)',
  'rgba(0,0,0,0.7)': 'rgba(255,255,255,0.85)',
  'rgba(0,0,0,0.9)': 'rgba(255,255,255,0.95)',
  '#e4e4e7': '#111827',
  '#ffffff': '#111827',
  '#fff': '#111827',
  '#71717a': '#4b5563',
  '#9ca3af': '#4b5563',
  '#a1a1aa': '#4b5563'
};

// Process replacements by avoiding double substitution
// We will replace them with placeholders first
let tempCss = css;
Object.entries(replacements).forEach(([key, val], index) => {
  // Be careful with #fff matching #ffffff
  if (key === '#fff') {
    tempCss = tempCss.replace(/#fff\b/gi, `__PLACEHOLDER_${index}__`);
  } else if (key === '#ffffff') {
    tempCss = tempCss.replace(/#ffffff\b/gi, `__PLACEHOLDER_${index}__`);
  } else {
    // Escape regex chars for string replace
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    tempCss = tempCss.replace(new RegExp(safeKey, 'gi'), `__PLACEHOLDER_${index}__`);
  }
});

// Now replace placeholders with actual target values
Object.entries(replacements).forEach(([key, val], index) => {
  tempCss = tempCss.replace(new RegExp(`__PLACEHOLDER_${index}__`, 'g'), val);
});

// Specific overrides for button text so it's visible on bright backgrounds
tempCss = tempCss.replace(/background-color: #ef4444;\s*color: #111827;/g, 'background-color: #ef4444;\n  color: #ffffff;');
tempCss = tempCss.replace(/background-color: #3b82f6;\s*color: #111827;/g, 'background-color: #3b82f6;\n  color: #ffffff;');

fs.writeFileSync('src/App.css', tempCss);
console.log('App.css updated correctly!');
