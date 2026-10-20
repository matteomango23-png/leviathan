// A tiny local receiver for screenshots of the game (testing only, never in the build): the dev page sends a frame
// it took with Phaser's renderer.snapshot (as a data URL) to http://127.0.0.1:5179/<name> and it is saved as
// <out>/<name>.jpg. Useful when the browser pane is hidden and its own screenshots do not update.
// Usage: node scripts/snap-server.mjs <out folder>
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? '.';
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method !== 'POST') return void res.end('ok');
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const name = `${(req.url ?? '/snap').slice(1) || 'snap'}.jpg`;
    writeFileSync(join(out, name), Buffer.from(body.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    res.end(`saved ${name}`);
  });
}).listen(5179, '127.0.0.1');
