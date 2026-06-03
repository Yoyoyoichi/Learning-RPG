const fs = require('fs');

let jsx = fs.readFileSync('src/App.jsx', 'utf8');

// The new files introduced dark backgrounds like #0a0a0c, #020617, and a radial gradient
jsx = jsx.replace(/#0a0a0c/g, '#f3f4f6');
jsx = jsx.replace(/#020617/g, '#ffffff');
jsx = jsx.replace(/radial-gradient\(circle, #2d1b10 0%, #0c0602 100%\)/g, '#f3f4f6');
jsx = jsx.replace(/#1f2937/g, '#e5e7eb');
jsx = jsx.replace(/#374151/g, '#d1d5db');
jsx = jsx.replace(/#060608/g, '#f3f4f6');

// Some text might be #e4e4e7 or similar inside retro-panel
jsx = jsx.replace(/#e4e4e7/g, '#111827');

fs.writeFileSync('src/App.jsx', jsx);
console.log('App.jsx updated correctly!');
