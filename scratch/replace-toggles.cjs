const fs = require('fs');
const file = 'views/peer-network.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the HTML
content = content.replace(
    `<button id="toggle-scan" class="flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl bg-primary text-text-primary transition-all btn-neumorphic">Scan</button>`,
    `<button id="toggle-scan" class="flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl bg-surface-deep/50 text-primary shadow-inner transition-all">Scan</button>`
);

// Replace JS logic for scanBtn click
const jsTarget1 = `      scanBtn.addEventListener('click', () => {
        scanBtn.classList.add('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');
        scanBtn.classList.remove('text-text-secondary', 'hover:text-text-primary');
        shareBtn.classList.add('text-text-secondary', 'hover:text-text-primary');
        shareBtn.classList.remove('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');`;

const jsReplace1 = `      scanBtn.addEventListener('click', () => {
        scanBtn.classList.add('bg-surface-deep/50', 'text-primary', 'shadow-inner');
        scanBtn.classList.remove('text-text-secondary', 'hover:text-text-primary', 'btn-neumorphic');
        shareBtn.classList.add('text-text-secondary', 'hover:text-text-primary', 'btn-neumorphic');
        shareBtn.classList.remove('bg-surface-deep/50', 'text-primary', 'shadow-inner');`;

content = content.replace(jsTarget1, jsReplace1);

// Replace JS logic for shareBtn click
const jsTarget2 = `      shareBtn.addEventListener('click', () => {
        shareBtn.classList.add('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');
        shareBtn.classList.remove('text-text-secondary', 'hover:text-text-primary');
        scanBtn.classList.add('text-text-secondary', 'hover:text-text-primary');
        scanBtn.classList.remove('bg-primary', 'text-text-primary', 'shadow-lg', 'shadow-primary/20');`;

const jsReplace2 = `      shareBtn.addEventListener('click', () => {
        shareBtn.classList.add('bg-surface-deep/50', 'text-primary', 'shadow-inner');
        shareBtn.classList.remove('text-text-secondary', 'hover:text-text-primary', 'btn-neumorphic');
        scanBtn.classList.add('text-text-secondary', 'hover:text-text-primary', 'btn-neumorphic');
        scanBtn.classList.remove('bg-surface-deep/50', 'text-primary', 'shadow-inner');`;

content = content.replace(jsTarget2, jsReplace2);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
