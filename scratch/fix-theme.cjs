const fs = require('fs');

// 1. Update app.js
let appContent = fs.readFileSync('app.js', 'utf8');
const appTarget = `    // ── Enforce global theme ──
    const isUnauthFlow = ['#/', '#/landing', '#/login', '#/register', '#/splash'].includes(hash);
    if (isUnauthFlow) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      try {
        if (localStorage.getItem('medcare-theme') === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      } catch(e) {}
    }`;

const appReplace = `    // ── Enforce global theme ──
    try {
      if (localStorage.getItem('medcare-theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch(e) {}`;

if (appContent.includes(appTarget)) {
    appContent = appContent.replace(appTarget, appReplace);
    fs.writeFileSync('app.js', appContent, 'utf8');
    console.log('Fixed app.js');
} else {
    console.log('Could not find target in app.js');
}

// 2. Update StoryEngine.js
let storyContent = fs.readFileSync('core/StoryEngine.js', 'utf8');
const storyTarget = `root.className = 'se-hide-scrollbar';`;
const storyReplace = `root.className = 'se-hide-scrollbar force-dark-theme';`;

if (storyContent.includes(storyTarget)) {
    storyContent = storyContent.replace(storyTarget, storyReplace);
    fs.writeFileSync('core/StoryEngine.js', storyContent, 'utf8');
    console.log('Fixed StoryEngine.js');
} else {
    console.log('Could not find target in StoryEngine.js');
}

// 3. Update WebGLLiquid.js
let webglContent = fs.readFileSync('core/WebGLLiquid.js', 'utf8');
const webglTarget = `const isLight = document.documentElement.getAttribute('data-theme') === 'light';`;
const webglReplace = `const isLight = false;`;

if (webglContent.includes(webglTarget)) {
    webglContent = webglContent.replace(webglTarget, webglReplace);
    fs.writeFileSync('core/WebGLLiquid.js', webglContent, 'utf8');
    console.log('Fixed WebGLLiquid.js');
} else {
    console.log('Could not find target in WebGLLiquid.js');
}
