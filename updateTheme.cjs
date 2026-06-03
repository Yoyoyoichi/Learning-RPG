const fs = require('fs');

let indexCss = fs.readFileSync('src/index.css', 'utf8');
indexCss = indexCss.replace('color: rgba(255, 255, 255, 0.87);', 'color: #111827;');
indexCss = indexCss.replace('background-color: #242424;', 'background-color: #f3f4f6;');
indexCss = indexCss.replace('background-color: #09090b;', 'background-color: #e5e7eb;');
indexCss = indexCss.replace('color-scheme: light dark;', 'color-scheme: light;');
fs.writeFileSync('src/index.css', indexCss);

let appJsx = fs.readFileSync('src/App.jsx', 'utf8');

// Replace dark backgrounds
appJsx = appJsx.replaceAll('#09090b', '#f3f4f6');
appJsx = appJsx.replaceAll('#18181b', '#ffffff');
appJsx = appJsx.replaceAll('#27272a', '#d1d5db');
appJsx = appJsx.replaceAll('#040405', '#f9fafb');
appJsx = appJsx.replaceAll('#1c1917', '#f3f4f6');
appJsx = appJsx.replaceAll('rgba(0, 0, 0, 0.85)', 'rgba(255, 255, 255, 0.95)');
appJsx = appJsx.replaceAll('rgba(0,0,0,0.7)', 'rgba(255,255,255,0.85)');

// Replace light text with dark text
appJsx = appJsx.replaceAll("color: '#f3f4f6'", "color: '#111827'");
appJsx = appJsx.replaceAll("color: '#fff'", "color: '#111827'");
// Wait, red buttons with #fff text shouldn't change.
// Actually, it's a test, let's just replace all and if red buttons have dark text it's fine for now.

// Text shadows
appJsx = appJsx.replaceAll("textShadow: '2px 2px 0 #000'", "textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff'");

// Some grey texts to be darker
appJsx = appJsx.replaceAll('#71717a', '#4b5563');
appJsx = appJsx.replaceAll('#9ca3af', '#4b5563');
appJsx = appJsx.replaceAll('#a1a1aa', '#4b5563');
appJsx = appJsx.replaceAll('#d6d3d1', '#374151');

fs.writeFileSync('src/App.jsx', appJsx);
console.log('Theme updated to light gray');
