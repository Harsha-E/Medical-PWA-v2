const fs = require('fs');
const file = 'views/peer-network.js';
let content = fs.readFileSync(file, 'utf8');

// Fix bottom padding
content = content.replace(
    `<main class="scroll-area pt-[112px] bg-transparent pb-24" style="padding-left:0; padding-right:0;">`,
    `<main class="scroll-area pt-[112px] bg-transparent pb-40" style="padding-left:0; padding-right:0;">`
);

// Fix QR code container centering
content = content.replace(
    `<div id="qr-container" class="bg-transparent p-4 inline-block relative z-10 min-h-[200px] min-w-[200px] flex items-center justify-center">`,
    `<div id="qr-container" class="bg-transparent p-4 flex w-full relative z-10 min-h-[200px] justify-center items-center mx-auto">`
);

// Fix QR code image centering
content = content.replace(
    `<img src="\${url}" alt="Pairing QR Code" class="shadow-[0_0_30px_var(--color-primary)] border-4 border-surface-deep bg-white p-2" style="border-radius: 0px; animation: float 4s ease-in-out infinite;" />`,
    `<img src="\${url}" alt="Pairing QR Code" class="shadow-[0_0_30px_var(--color-primary)] border-4 border-surface-deep bg-white p-2 block mx-auto" style="border-radius: 0px; animation: float 4s ease-in-out infinite;" />`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Padding and alignment fixed successfully');
