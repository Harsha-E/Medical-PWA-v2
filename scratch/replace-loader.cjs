const fs = require('fs');
const file = 'views/peer-network.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `<div id="qr-loader" class="flex space-x-2 justify-center items-center h-full">
                        <div class="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                        <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-3 h-3 bg-primary rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>`;

const replace1 = `<div id="qr-loader" class="w-48 h-48 rounded-[2rem] bg-surface-elevated/40 animate-pulse border-4 border-surface-deep flex items-center justify-center mx-auto"></div>`;

content = content.replace(target1, replace1);

const target2 = `<div id="qr-loader" class="clay-loader is-active"></div>`;
const replace2 = `<div id="qr-loader" class="w-48 h-48 rounded-[2rem] bg-surface-elevated/40 animate-pulse border-4 border-surface-deep flex items-center justify-center mx-auto"></div>`;

content = content.replace(target2, replace2);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
