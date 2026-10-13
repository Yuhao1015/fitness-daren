import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { missingHandlers } from './lib/bindings.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'miniprogram');
const problems = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.wxml')) {
      const ts = full.replace(/\.wxml$/, '.ts');
      if (!fs.existsSync(ts)) continue;
      const miss = missingHandlers(fs.readFileSync(full, 'utf8'), fs.readFileSync(ts, 'utf8'));
      if (miss.length) problems.push(`${path.relative(root, full)}: ${miss.join(', ')}`);
    }
  }
}

walk(root);
if (problems.length) {
  console.log('Handlers used in WXML but missing in TS:\n' + problems.join('\n'));
  process.exit(1);
}
