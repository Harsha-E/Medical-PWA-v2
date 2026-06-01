const fs = require('fs');
const files = fs.readdirSync('views').filter(f => f.endsWith('.js'));
files.forEach(f => {
  let content = fs.readFileSync('views/'+f, 'utf8');
  let modified = false;
  // We match <main class="... px-6 ...">
  content = content.replace(/<main\s+class="([^"]*?)\b(px-\d+|md:px-\d+)\b([^"]*?)"/g, (match, p1, p2, p3) => {
    modified = true;
    let newClass = (p1 + " " + p3).replace(/\s+/g, ' ').trim();
    return `<main class="${newClass}" style="padding-left:0; padding-right:0;">\n<div class="${p2} w-full h-full max-w-7xl mx-auto flex flex-col flex-1"`;
  });
  
  // also need to replace </main> with </div></main>
  if (modified) {
    content = content.replace(/<\/main>/g, '</div></main>');
    fs.writeFileSync('views/'+f, content);
    console.log('Fixed padding in', f);
  }
});
