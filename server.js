/**
 * MedCare | Local Development Server
 * Run: node server.js
 * Opens at: http://localhost:3000
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8007;

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
          res.writeHead(200, { 'Content-Type': 'text/html' });
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
      
      // We have REMOVED:
      // - Cross-Origin-Opener-Policy
      // - Cross-Origin-Embedder-Policy
      // - Cross-Origin-Resource-Policy
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  \x1b[43m\x1b[50m MedCheck Dev Server \x1b[0m');
  console.log(`  \x1b[36mLocal:\x1b[0m   http://localhost:${PORT}`);
  console.log(`  \x1b[36mNetwork:\x1b[0m http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('  \x1b[90mCtrl+C to stop\x1b[0m');
  console.log('');
});