import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

export interface Editor { view: EditorView; get(): string; set(s: string): void; insert(t: string): void; undo(): void; focus(): void }

export function createEditor(parent: HTMLElement, doc: string, onChange: (s: string) => void): Editor {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(), history(), drawSelection(), highlightActiveLine(), indentOnInput(), bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }), java(), oneDark,
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off' }),
        EditorView.updateListener.of(u => { if (u.docChanged) onChange(u.state.doc.toString()); }),
      ],
    }),
  });
  return {
    view,
    get: () => view.state.doc.toString(),
    set: s => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: s } }),
    insert: t => { view.dispatch(view.state.replaceSelection(t)); view.focus(); },
    undo: () => { undo(view); view.focus(); },
    focus: () => view.focus(),
  };
}
