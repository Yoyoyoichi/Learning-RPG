const fs = require('fs');

let css = fs.readFileSync('src/App.css', 'utf8');

// Replace dark backgrounds
css = css.replaceAll('#09090b', '#f3f4f6');
css = css.replaceAll('#18181b', '#ffffff');
css = css.replaceAll('#27272a', '#d1d5db');
css = css.replaceAll('#040405', '#f9fafb');
css = css.replaceAll('#1c1917', '#f3f4f6');
css = css.replaceAll('rgba(0, 0, 0, 0.85)', 'rgba(255, 255, 255, 0.95)');
css = css.replaceAll('rgba(0,0,0,0.7)', 'rgba(255,255,255,0.85)');
css = css.replaceAll('rgba(0,0,0,0.9)', 'rgba(255,255,255,0.95)');

// Replace light text with dark text
css = css.replaceAll('#f3f4f6', '#111827');
css = css.replaceAll('#e4e4e7', '#111827');
// Special handling for #fff: we'll replace it generally but if buttons look bad, we'll fix later
css = css.replaceAll('#fff', '#111827');
css = css.replaceAll('#ffffff', '#111827');

// Fix specific text colors back to white for buttons that have solid backgrounds
css = css.replaceAll('background-color: #ef4444;\n  color: #111827;', 'background-color: #ef4444;\n  color: #ffffff;');
css = css.replaceAll('background-color: #3b82f6;\n  color: #111827;', 'background-color: #3b82f6;\n  color: #ffffff;');
css = css.replaceAll('background: #ef4444;\n  color: #111827;', 'background: #ef4444;\n  color: #ffffff;');

// Muted text
css = css.replaceAll('#71717a', '#4b5563');
css = css.replaceAll('#9ca3af', '#4b5563');
css = css.replaceAll('#a1a1aa', '#4b5563');

fs.writeFileSync('src/App.css', css);
console.log('App.css updated to light gray');
