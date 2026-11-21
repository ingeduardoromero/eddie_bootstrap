import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const root = new URL('../problems/', import.meta.url);
const dirs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
const out = [];
for (const d of dirs) {
  const f = new URL(`${d}/problem.json`, root);
  if (!existsSync(f)) continue;
  const { hidden, ...p } = JSON.parse(readFileSync(f, 'utf8'));
  out.push({ ...p, hiddenCount: hidden.length, hiddenB64: Buffer.from(JSON.stringify(hidden), 'utf8').toString('base64') });
}
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/problems.generated.json', import.meta.url), JSON.stringify(out));
console.log(`built ${out.length} problems`);
