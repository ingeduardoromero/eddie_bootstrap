// Real-JDK validation: reference passes everything, wrong solution fails >=1 hidden test.
import { readdirSync, readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate, generateMain } from '../src/harness';
import type { ProblemSource, TestCase } from '../src/types';

const root = new URL('../problems/', import.meta.url).pathname;
const dirs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
let failures = 0;
const fail = (m: string) => { failures++; console.error('  FAIL: ' + m); };

function run(p: ProblemSource, code: string, tests: TestCase[]) {
  const dir = mkdtempSync(join(tmpdir(), 'gca-'));
  writeFileSync(join(dir, 'Main.java'), generateMain(p.params, code, tests, 'stdout'));
  try {
    execFileSync('javac', ['-d', dir, join(dir, 'Main.java')], { stdio: 'pipe' });
    const out = execFileSync('java', ['-cp', dir, 'Main'], { timeout: 10000, stdio: 'pipe' }).toString();
    return evaluate(out, tests);
  } catch (e: any) { return { error: String(e.stderr || e.message) }; }
}

for (const d of dirs) {
  const pf = join(root, d, 'problem.json');
  if (!existsSync(pf)) continue;
  const p: ProblemSource = JSON.parse(readFileSync(pf, 'utf8'));
  console.log(`# ${d}`);
  if (p.examples.length !== 2) fail('needs exactly 2 examples');
  if (p.visible.length !== 3) fail('needs exactly 3 visible tests');
  if (p.hidden.length < 10) fail('needs >=10 hidden tests');
  const all = [...p.examples, ...p.visible, ...p.hidden];
  const ref = run(p, readFileSync(join(root, d, 'reference.java'), 'utf8'), all);
  if ('error' in ref) { fail('reference: ' + ref.error); continue; }
  const bad = ref.filter(r => !r.ok);
  if (bad.length) fail(`reference fails ${bad.length}/${all.length}: ` + JSON.stringify(bad.slice(0, 3)));
  const wrong = run(p, readFileSync(join(root, d, 'wrong.java'), 'utf8'), all);
  if ('error' in wrong) { fail('wrong.java must compile: ' + wrong.error); continue; }
  const nEx = p.examples.length + p.visible.length;
  const hiddenFails = wrong.slice(nEx).filter(r => !r.ok).length;
  if (hiddenFails < 1) fail('wrong solution passes all hidden tests');
  const visFails = wrong.slice(0, nEx).filter(r => !r.ok).length;
  console.log(`  ok  ref ${all.length}/${all.length}, wrong fails ${hiddenFails} hidden, ${visFails} visible/example`);
}
if (failures) { console.error(`${failures} validation failure(s)`); process.exit(1); }
console.log('all problems valid');
