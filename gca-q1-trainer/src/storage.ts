const K = 'gcaq1:v1';
interface State { code: Record<string, string>; solved: Record<string, boolean>; started: Record<string, number>; best: Record<string, number> }
const empty = (): State => ({ code: {}, solved: {}, started: {}, best: {} });
let mem: State = empty();
try { const r = localStorage.getItem(K); if (r) mem = { ...empty(), ...JSON.parse(r) }; } catch { /* private mode */ }
function save() { try { localStorage.setItem(K, JSON.stringify(mem)); } catch { /* ignore */ } }
export const store = {
  getCode: (id: number) => mem.code[id],
  setCode(id: number, c: string) { mem.code[id] = c; save(); },
  solved: (id: number) => !!mem.solved[id],
  setSolved(id: number) { mem.solved[id] = true; save(); },
  getStart: (id: number) => mem.started[id],
  setStart(id: number, t: number) { mem.started[id] = t; save(); },
  resetTimer(id: number) { delete mem.started[id]; save(); },
};
