// Fails if any file in src/ imports itself back through a chain of imports (CLAUDE.md: no circular
// dependencies). Type-only imports count too. Run by `npm run check` (via `npm run lint`).
import fs from 'node:fs';
import path from 'node:path';

const files = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.ts')) files.push(path.normalize(p));
  }
};
walk('src');

const graph = new Map();
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const deps = [];
  const re = /^(?:import|export)\s[^'"]*?from\s+'(\.[^']+)'/gm;
  let m;
  while ((m = re.exec(text))) {
    let target = path.normalize(path.join(path.dirname(f), m[1]));
    if (!target.endsWith('.ts')) target += '.ts';
    if (fs.existsSync(target)) deps.push(target);
  }
  graph.set(f, deps);
}

const cycles = [];
const state = new Map(); // 1 = visiting, 2 = done
const stack = [];
const visit = (n) => {
  state.set(n, 1);
  stack.push(n);
  for (const d of graph.get(n) ?? []) {
    if (state.get(d) === 1) cycles.push([...stack.slice(stack.indexOf(d)), d].join(' -> '));
    else if (!state.has(d)) visit(d);
  }
  stack.pop();
  state.set(n, 2);
};
for (const f of files) if (!state.has(f)) visit(f);

if (cycles.length) {
  console.error('Circular imports found:\n' + cycles.join('\n'));
  process.exit(1);
}
console.log(`No circular imports (${files.length} files).`);
