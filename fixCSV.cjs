const fs = require('fs');
let jsx = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /onImportCustomWords=\{\(words\) => \{([\s\S]*?)onClearCustomWords=\{\(\) => \{([\s\S]*?)\}\}/g;

const replacement = `onImportCustomWords={(words) => {
        setCustomWords(words);
        
        // Convert words to questions and save to localStorage so the quiz system uses them
        const customQs = words.map((w, i) => ({
          id: Date.now() + i,
          category: 'カスタム単語',
          type: 'input',
          question: \`\${w.word} の意味は？\`,
          answer: w.meaning
        }));
        
        localStorage.setItem('learning_rpg_custom_questions', JSON.stringify(customQs));
        addLog(\`カスタム単語リスト (\${words.length}語) を読み込み、問題として設定しました！\`, 'system');
      }}
      onClearCustomWords={() => {
        setCustomWords([]);
        localStorage.removeItem('learning_rpg_custom_questions');
        addLog('カスタム単語をクリアし、デフォルトの問題に戻しました。', 'system');
      }}`;

jsx = jsx.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', jsx);
