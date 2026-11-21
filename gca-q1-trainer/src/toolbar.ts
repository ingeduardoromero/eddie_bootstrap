import type { Editor } from './editor';

const KEYS: [label: string, text: string][] = [
  ['Tab', '    '], ['{', '{'], ['}', '}'], ['(', '('], [')', ')'], ['[', '['], [']', ']'], [';', ';'], ['=', '='],
  ['<', '<'], ['>', '>'], ['+', '+'], ['-', '-'], ['%', '%'], ['"', '"'],
];

/** Sticky row above the on-screen keyboard. Buttons use pointerdown+preventDefault so the editor keeps focus. */
export function createToolbar(editor: Editor): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'keybar';
  const add = (label: string, fn: () => void, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.className = 'key ' + cls;
    b.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
    bar.appendChild(b);
  };
  for (const [l, t] of KEYS) add(l, () => editor.insert(t));
  add('Undo', () => editor.undo(), 'undo');
  // Keep the bar above the iOS/Android keyboard.
  const vv = window.visualViewport;
  if (vv) {
    const place = () => { bar.style.transform = `translateY(${-(window.innerHeight - vv.height - vv.offsetTop)}px)`; };
    vv.addEventListener('resize', place); vv.addEventListener('scroll', place);
  }
  return bar;
}
