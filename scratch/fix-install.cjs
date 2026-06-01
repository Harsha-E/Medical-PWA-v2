const fs = require('fs');

// 1. services/PwaInstallManager.js
const pwaFile = 'services/PwaInstallManager.js';
let pwaContent = fs.readFileSync(pwaFile, 'utf8');

const notNowTarget = `<button id="pwa-not-now-btn" class="text-gray-400 hover:text-white px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors focus:outline-none">`;
const notNowReplace = `<button id="pwa-not-now-btn" class="hidden sm:block text-gray-400 hover:text-white px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors focus:outline-none">`;

if (pwaContent.includes(notNowTarget)) {
    pwaContent = pwaContent.replace(notNowTarget, notNowReplace);
    fs.writeFileSync(pwaFile, pwaContent, 'utf8');
    console.log('Fixed PwaInstallManager');
} else {
    console.log('Could not find Not Now button in PwaInstallManager');
}

// 2. views/install.js
const installFile = 'views/install.js';
let installContent = fs.readFileSync(installFile, 'utf8');

const containerTarget = `<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">`;
const containerReplace = `<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col justify-center items-center flex-1">`;

if (installContent.includes(containerTarget)) {
    installContent = installContent.replace(containerTarget, containerReplace);
    fs.writeFileSync(installFile, installContent, 'utf8');
    console.log('Fixed views/install.js');
} else {
    console.log('Could not find container in views/install.js');
}
