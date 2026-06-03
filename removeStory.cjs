const fs = require('fs');
let jsx = fs.readFileSync('src/App.jsx', 'utf8');

jsx = jsx.replace(/generateFloorStory\(1\)\.then\(data => \{([\s\S]*?)\];\n    \}\);/g, `setIsStoryLoading(false);`);
jsx = jsx.replace(/generateFloorStory\(nextFloorNum\)\.then\(data => \{([\s\S]*?)\];\n    \}\);/g, `setIsStoryLoading(false);`);

fs.writeFileSync('src/App.jsx', jsx);
