const fs = require('fs');
const file = 'views/install.js';
let content = fs.readFileSync(file, 'utf8');

// Replace bg-surface-deep/40 with bg-[#0a040f]/40
content = content.replace('bg-surface-deep/40', 'bg-[#0a040f]/40');

// Replace this.ctx.fillStyle = 'var(--color-surface-deep)'; with this.ctx.fillStyle = '#0a040f';
content = content.replace(`this.ctx.fillStyle = 'var(--color-surface-deep)';`, `this.ctx.fillStyle = '#0a040f';`);

// Replace var(--color-surface-deep) in any other potential spots (none exist based on previous view, but just in case)
content = content.replace(/var\(--color-surface-deep\)/g, '#0a040f');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed install.js colors');
