const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  let changedFiles = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      changedFiles += processDir(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Special handling for auth screens (no sidebar padding on desktop)
      const isAuthScreen = ['login.js', 'register.js', 'landing.js', 'splash.js'].includes(file);

      if (!isAuthScreen) {
        content = content.replace(/pt-\[112px\]/g, 'pt-[112px] md:pt-8 md:pl-64 lg:pl-72');
      }

      content = content.replace(/px-4(?!\s*md:)/g, 'px-4 md:px-8 lg:px-12');
      
      // Upgrade 1-col grids to responsive grids
      if (!content.includes('md:grid-cols-2')) {
        content = content.replace(/grid-cols-1(?!\s*md:)/g, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3');
      }
      
      // Upgrade max widths for containers
      if (!content.includes('md:max-w-4xl')) {
        content = content.replace(/max-w-2xl(?!\s*md:)/g, 'max-w-2xl md:max-w-4xl lg:max-w-5xl');
      }

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${file}`);
        changedFiles++;
      }
    }
  });
  return changedFiles;
}

const total = processDir(viewsDir);
console.log(`\nTotal files updated: ${total}`);
