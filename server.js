import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 8013;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.txt':  'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  // Strip query strings
  let urlPath = req.url.split('?')[0];

  // Default to index.html for root
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback — serve index.html for any unknown path
        // so hash-based routing works on direct URL access
        fs.readFile(path.join(__dirname, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(500);
            res.end('Server Error');
            return;
          }
          res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Cross-Origin-Opener-Policy': 'unsafe-none'
          });
          res.end(html);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
      return;
    }

    // NUCLEAR OPTION: Stripped of all cross-origin restrictions
    res.writeHead(200, {
      'Content-Type': contentType,
      // Allow service worker to work at root scope
      'Service-Worker-Allowed': '/',
      
      // Explicitly allow Firebase Auth Popups
      'Cross-Origin-Opener-Policy': 'unsafe-none'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const networkIp = getLocalIp();
  console.log('');
  console.log('  \x1b[43m\x1b[30m MedCheck Dev Server \x1b[0m');
  console.log(`  \x1b[36mLocal:\x1b[0m   http://localhost:${PORT}`);
  console.log(`  \x1b[36mNetwork:\x1b[0m http://${networkIp}:${PORT}`);
  console.log('');
  console.log('  \x1b[90mCtrl+C to stop\x1b[0m');
  console.log('');
});