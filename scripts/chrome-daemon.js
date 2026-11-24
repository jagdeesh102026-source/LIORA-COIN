const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const portFile = 'C:\\Users\\Dell\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
const chromePath = 'C:\\Users\\Dell\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

chrome.stderr.on('data', (d) => {
  const text = d.toString();
  console.log('[Chrome]', text.trim());
  const match = text.match(/DevTools listening on ws:\/\/127\.0\.0\.1:9222(\/devtools\/browser\/[a-zA-Z0-9-]+)/);
  if (match) {
    const wsPath = match[1];
    const content = `9222\r\n${wsPath}\r\n`;
    fs.mkdirSync(path.dirname(portFile), { recursive: true });
    fs.writeFileSync(portFile, content, 'utf8');
    console.log('DEVTOOLS_ACTIVE_PORT_WRITTEN:', wsPath);
  }
});

chrome.on('exit', (code, sig) => {
  console.log('Chrome exited with code:', code, sig);
  process.exit(code || 0);
});
