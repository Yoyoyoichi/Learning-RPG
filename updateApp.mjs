import fs from 'fs';

let appJsx = fs.readFileSync('src/App.jsx', 'utf-8');

appJsx = appJsx.replace(
  `            const dummy1 = parts[5] ? parts[5].trim() : '';
            const dummy2 = parts[6] ? parts[6].trim() : '';
            const dummy3 = parts[7] ? parts[7].trim() : '';

            customQuestions.push({
              id: parseInt(id) || Date.now() + i,
              category,
              type,
              question,
              answer,
              choices: type === 'choice' ? [answer, dummy1, dummy2, dummy3].filter(Boolean) : undefined
            });`,
  `            const dummy1 = parts[5] ? parts[5].trim() : '';
            const dummy2 = parts[6] ? parts[6].trim() : '';
            const dummy3 = parts[7] ? parts[7].trim() : '';
            const explanation = parts[8] ? parts[8].trim() : null;

            customQuestions.push({
              id: parseInt(id) || Date.now() + i,
              category,
              type,
              question,
              answer,
              choices: type === 'choice' ? [answer, dummy1, dummy2, dummy3].filter(Boolean) : undefined,
              explanation: explanation || null
            });`
);

fs.writeFileSync('src/App.jsx', appJsx, 'utf-8');
console.log('Fixed handleImportCustomQuestions');
