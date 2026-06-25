const fs = require('fs');
const path = require('path');

const file = './index.html';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/slate-/g, 'zinc-');
fs.writeFileSync(file, content, 'utf8');
