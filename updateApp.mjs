import fs from 'fs';

let appJsx = fs.readFileSync('src/App.jsx', 'utf-8');

// target1:
appJsx = appJsx.replace(
  /choices: row\.type === 'choice' \? \[row\.answer, row\.dummy1, row\.dummy2, row\.dummy3\]\.filter\(Boolean\) : undefined,/,
  `choices: row.type === 'choice' ? [row.answer, row.dummy1, row.dummy2, row.dummy3].filter(Boolean) : undefined,
              explanation: row.explanation || row['解説'] || null,`
);

// target2:
appJsx = appJsx.replace(
  /const dummy3 = parts\[7\] \? parts\[7\]\.trim\(\) : '';/,
  `const dummy3 = parts[7] ? parts[7].trim() : '';
            const explanation = parts[8] ? parts[8].trim() : null;`
);

appJsx = appJsx.replace(
  /choices: type === 'choice' \? \[answer, dummy1, dummy2, dummy3\]\.filter\(Boolean\) : undefined/,
  `choices: type === 'choice' ? [answer, dummy1, dummy2, dummy3].filter(Boolean) : undefined,
              explanation: explanation || null`
);

fs.writeFileSync('src/App.jsx', appJsx, 'utf-8');
console.log('Done');
