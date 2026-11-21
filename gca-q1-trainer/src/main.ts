import data from './data/problems.generated.json';
import type { CaseResult, JValue, Problem, RunOutcome, TestCase } from './types';
import { createEditor, type Editor } from './editor';
import { createToolbar } from './toolbar';
import { starterCode } from './harness';
import { loadRuntime, runJava, needsReload } from './runner';
import { store } from './storage';
import { fmt, remaining } from './timer';

const problems = data as Problem[];
const app = document.getElementById('app')!;
let tick: number | undefined;

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const rich = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const show = (v: JValue) => Array.isArray(v) ? `[${v.join(', ')}]` : typeof v === 'string' ? JSON.stringify(v) : String(v);
const decodeHidden = (p: Problem): TestCase[] => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.hiddenB64), c => c.charCodeAt(0))));

function home() {
  clearInterval(tick);
  app.innerHTML = `<h1>GCA Q1 Trainer</h1><div class="list">${problems.map(p =>
    `<button class="item" data-id="${p.id}"><span>${store.solved(p.id) ? '✅' : '▫️'} ${p.id}. ${esc(p.title)}</span><span class="tag ${p.difficulty}">${p.difficulty}</span></button>`).join('')}</div>
    <p class="status">Edit Java inline · Run = visible tests · Submit = + hidden tests · 10 min per problem.</p>`;
  app.querySelectorAll<HTMLButtonElement>('.item').forEach(b => b.onclick = () => { location.hash = `#/${b.dataset.id}`; });
}

function problemView(p: Problem) {
  clearInterval(tick);
  if (store.getStart(p.id) === undefined) store.setStart(p.id, Date.now());
  const sig = `${p.returnType} solution(${p.params.map(a => `${a.type} ${a.name}`).join(', ')})`;
  app.innerHTML = `
    <div class="topbar"><button id="back" aria-label="Back">←</button><h2>${p.id}. ${esc(p.title)}</h2><span class="timer" id="timer"></span></div>
    <details open class="stmt"><summary>Statement</summary>
      ${p.statement.split('\n').map(l => `<p>${rich(l)}</p>`).join('')}
      <pre class="sig">${esc(sig)}</pre>
      ${p.examples.map((e, i) => `<b>Example ${i + 1}</b><pre>${p.params.map((a, k) => `${a.name} = ${esc(show(e.args[k]))}`).join('\n')}\nsolution(...) = ${esc(show(e.expected))}</pre>${e.explanation ? `<p>${rich(e.explanation)}</p>` : ''}`).join('')}
      <b>Constraints</b><ul>${p.constraints.map(c => `<li>${rich(c)}</li>`).join('')}</ul>
    </details>
    <div id="ed"></div><div id="kb"></div>
    <div class="actions"><button id="run" class="primary">▶ Run</button><button id="sub" class="submit">✔ Submit</button></div>
    <div class="status" id="status"></div><div class="bar" id="bar" hidden><i></i></div>
    <div id="out"></div>
    <div class="row"><button id="reset">Reset code</button><button id="rt">Restart timer</button></div>`;
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const saved = store.getCode(p.id);
  const editor: Editor = createEditor($('ed'), saved ?? starterCode(p.returnType, p.params), c => store.setCode(p.id, c));
  $('kb').replaceWith(createToolbar(editor));
  $('back').onclick = () => { location.hash = ''; };
  $('reset').onclick = () => { if (confirm('Reset code to the starter?')) editor.set(starterCode(p.returnType, p.params)); };
  $('rt').onclick = () => { store.setStart(p.id, Date.now()); paint(); };
  const paint = () => {
    const r = remaining(store.getStart(p.id));
    const t = $('timer'); t.textContent = r === 0 ? "Time's up" : fmt(r); t.classList.toggle('low', r < 60000);
  };
  paint(); tick = window.setInterval(paint, 1000);

  const status = $('status'), bar = $('bar'), out = $('out');
  const setStatus = (s: string, busy = true) => { status.textContent = s; bar.hidden = !busy; };
  const buttons = [$('run'), $('sub')] as HTMLButtonElement[];
  async function go(submit: boolean) {
    buttons.forEach(b => b.disabled = true); out.innerHTML = '';
    const hidden = submit ? decodeHidden(p) : [];
    const tests: TestCase[] = [...p.visible, ...hidden];
    const outcome = await runJava(p.params, editor.get(), tests, setStatus);
    setStatus('', false); buttons.forEach(b => b.disabled = false);
    out.innerHTML = render(p, outcome, submit);
    if (outcome.kind === 'ok' && outcome.results.every(r => r.ok) && submit) store.setSolved(p.id);
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('run').onclick = () => go(false);
  $('sub').onclick = () => go(true);
  // Warm up the runtime in the background after first paint.
  setTimeout(() => { loadRuntime(s => setStatus(s, s !== 'Ready')).then(() => setStatus('Java ready', false)).catch(e => setStatus(String(e.message), false)); }, 300);
}

function render(p: Problem, o: RunOutcome, submit: boolean): string {
  if (o.kind === 'compile_error') return `<div class="res bad"><b class="bad">Compile error</b>${o.errors.map(e => `<div class="err">Line ${e.line}: ${esc(e.message)}</div>`).join('')}</div>`;
  if (o.kind === 'timeout') return `<div class="res bad"><b class="bad">Time limit exceeded (5s)</b><div class="err">Reload the page to reset Java. Your code is saved.</div><button onclick="location.reload()">Reload</button></div>`;
  if (o.kind === 'internal_error') return `<div class="res bad"><b class="bad">Runner error</b><div class="err">${esc(o.message)}</div>${needsReload ? '<button onclick="location.reload()">Reload</button>' : ''}</div>`;
  const nv = p.visible.length, vis = o.results.slice(0, nv), hid = o.results.slice(nv);
  const passed = o.results.filter(r => r.ok).length;
  let h = `<div class="summary">${passed === o.results.length ? '🎉 All ' : ''}${passed}/${o.results.length} passed${submit && passed === o.results.length ? ' — solved!' : ''}</div>`;
  h += vis.map((r: CaseResult, i) => {
    const t = p.visible[i];
    const args = p.params.map((a, k) => `${a.name} = ${show(t.args[k])}`).join(', ');
    return `<div class="res ${r.ok ? 'ok' : 'bad'}"><b class="${r.ok ? 'ok' : 'bad'}">Test ${i + 1}: ${r.ok ? 'passed' : 'failed'}</b><pre>${esc(args)}\nexpected: ${esc(show(t.expected))}\nactual:   ${esc(r.error ? 'EXCEPTION ' + r.error : r.actual ?? '')}</pre></div>`;
  }).join('');
  if (submit) h += `<div class="res">${hid.map((r, i) => `<div>Hidden ${i + 1}: <b class="${r.ok ? 'ok' : 'bad'}">${r.ok ? 'passed' : 'failed'}</b></div>`).join('')}</div>`;
  return h;
}

function route() {
  const m = /^#\/(\d+)$/.exec(location.hash);
  const p = m && problems.find(x => x.id === Number(m[1]));
  p ? problemView(p) : home();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
