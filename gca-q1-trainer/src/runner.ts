// CheerpJ 3 runner: lazily loads the runtime, compiles with ECJ (open-source Eclipse compiler) and runs.
import { evaluate, generateMain, parseEcjLog } from './harness';
import type { Param, RunOutcome, TestCase } from './types';

declare const cheerpjInit: (o?: object) => Promise<void>;
declare const cheerpjRunMain: (cls: string, cp: string, ...args: string[]) => Promise<number>;
declare const cheerpOSAddStringFile: (path: string, content: string) => void;
declare const cjFileBlob: (path: string) => Promise<Blob>;

const LOADER = 'https://cjrtnc.leaningtech.com/3.0/cj3loader.js';
export const RUN_TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 60000;

let ready: Promise<void> | null = null;
let seq = 0;
export let needsReload = false;

export function loadRuntime(onStatus: (s: string) => void): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    onStatus('Downloading Java runtime…');
    await new Promise<void>((res, rej) => {
      const s = document.createElement('script');
      s.src = LOADER; s.onload = () => res(); s.onerror = () => rej(new Error('Could not load CheerpJ (offline?)'));
      document.head.appendChild(s);
    });
    onStatus('Starting JVM…');
    await cheerpjInit({ version: 8 });
    onStatus('Ready');
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([p, new Promise<'timeout'>(r => setTimeout(() => r('timeout'), ms))]);
}

async function readFile(path: string): Promise<string> {
  try { return await (await cjFileBlob(path)).text(); } catch { return ''; }
}

export async function runJava(
  params: Param[], userCode: string, tests: TestCase[], onStatus: (s: string) => void,
): Promise<RunOutcome> {
  if (needsReload) return { kind: 'internal_error', message: 'A previous run timed out. Reload the page (your code is saved).' };
  try {
    await loadRuntime(onStatus);
    const n = ++seq, cls = `Main${n}`, res = `/files/res${n}.txt`, log = `/files/ecj${n}.log`;
    const src = generateMain(params, userCode, tests, 'file', cls, res);
    cheerpOSAddStringFile(`/str/${cls}.java`, src);
    const base = '/app' + new URL('.', location.href).pathname;
    onStatus('Compiling…');
    const c = await withTimeout(cheerpjRunMain(
      'org.eclipse.jdt.internal.compiler.batch.Main', `${base}ecj.jar`,
      '-1.8', '-nowarn', '-proc:none', '-d', `/files/out${n}`, '-log', log, `/str/${cls}.java`), COMPILE_TIMEOUT_MS);
    if (c === 'timeout') { needsReload = true; return { kind: 'internal_error', message: 'Compiler timed out. Reload the page.' }; }
    const raw = await readFile(log);
    const errors = parseEcjLog(raw);
    if (c !== 0 || errors.length) {
      return { kind: 'compile_error', errors: errors.length ? errors : [{ line: 1, message: raw.trim() || 'Compilation failed' }], raw };
    }
    onStatus('Running…');
    const r = await withTimeout(cheerpjRunMain(cls, `/files/out${n}`), RUN_TIMEOUT_MS);
    if (r === 'timeout') { needsReload = true; return { kind: 'timeout' }; }
    const text = await readFile(res);
    if (!text) return { kind: 'internal_error', message: 'Program produced no results (crashed?).' };
    return { kind: 'ok', results: evaluate(text, tests) };
  } catch (e) {
    return { kind: 'internal_error', message: e instanceof Error ? e.message : String(e) };
  }
}
