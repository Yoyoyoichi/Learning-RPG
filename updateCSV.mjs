import fs from 'fs';

let csv = fs.readFileSync('public/default_questions.csv', 'utf-8');
if (!csv.includes('explanation') && !csv.includes('解説')) {
  // Update header
  csv = csv.replace('id,category,type,question,answer,dummy1,dummy2,dummy3', 'id,category,type,question,answer,dummy1,dummy2,dummy3,explanation');
  
  // Try to append explanations to the first few lines to test it
  let lines = csv.split(/\r?\n/);
  if (lines.length > 1 && lines[1].trim() !== "") {
    lines[1] = lines[1] + ',"お米作りが始まる前（縄文時代）は、木の実やイノシシなどを食べていたんだよ！"';
  }
  if (lines.length > 2 && lines[2].trim() !== "") {
    lines[2] = lines[2] + ',"平安時代から、貴族がお祝いの儀式などで『おせち料理』の原型となるものを食べていました。"';
  }
  if (lines.length > 3 && lines[3].trim() !== "") {
    lines[3] = lines[3] + ',"ペリーは1853年に黒船に乗ってやってきて、日本に開国を迫ったよ。"';
  }
  fs.writeFileSync('public/default_questions.csv', lines.join('\n'), 'utf-8');
}
console.log('Done CSV');
