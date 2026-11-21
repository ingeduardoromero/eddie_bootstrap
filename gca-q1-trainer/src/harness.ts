// Pure TS (no DOM): shared by the browser runner and the CI validator.
import type { CaseResult, JType, JValue, Param, TestCase } from './types';

export const RESULTS_FILE = '/files/results.txt';

export function javaLiteral(type: JType, v: JValue): string {
  switch (type) {
    case 'int': return String(v);
    case 'long': return String(v) + 'L';
    case 'boolean': return v ? 'true' : 'false';
    case 'String': return JSON.stringify(v); // ASCII-only strings: JSON escapes == Java escapes
    case 'int[]': return `new int[]{${(v as number[]).join(',')}}`;
  }
}

export function starterCode(returnType: JType, params: Param[]): string {
  const sig = params.map(p => `${p.type} ${p.name}`).join(', ');
  const dflt: Record<JType, string> = { int: '0', long: '0', boolean: 'false', String: '""', 'int[]': 'new int[0]' };
  return `${returnType} solution(${sig}) {\n    \n    return ${dflt[returnType]};\n}\n`;
}

const HELPERS = `
  static String __j(Object o) {
    if (o instanceof String) {
      String s = (String) o; StringBuilder b = new StringBuilder("\\"");
      for (int i = 0; i < s.length(); i++) { char c = s.charAt(i);
        if (c == '"' || c == '\\\\') b.append('\\\\').append(c);
        else if (c == '\\n') b.append("\\\\n"); else b.append(c); }
      return b.append('"').toString();
    }
    if (o instanceof int[]) { int[] a = (int[]) o; StringBuilder b = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); }
      return b.append(']').toString(); }
    return String.valueOf(o);
  }`;

/** Line 1 holds the prefix AND the first user line, so user line N == javac line N. */
export function generateMain(params: Param[], userCode: string, tests: TestCase[], sink: 'stdout' | 'file', cls = 'Main', resultsPath = RESULTS_FILE): string {
  const calls = tests.map((t, i) => {
    const args = params.map((p, k) => javaLiteral(p.type, t.args[k])).join(', ');
    return `    try { Object r = m.solution(${args}); out.append("@@T ${i} OK ").append(__j(r)).append('\\n'); }\n` +
      `    catch (Throwable e) { out.append("@@T ${i} EXC ").append(e.getClass().getSimpleName()).append(": ").append(String.valueOf(e.getMessage()).replace('\\n', ' ')).append('\\n'); }\n`;
  }).join('');
  const emit = sink === 'file'
    ? `    try (java.io.FileWriter w = new java.io.FileWriter("${resultsPath}")) { w.write(out.toString()); }`
    : `    System.out.print(out);`;
  return `import java.util.*; public class ${cls} {${userCode}\n${HELPERS}\n  public static void main(String[] args) throws Exception {\n    ${cls} m = new ${cls}(); StringBuilder out = new StringBuilder();\n${calls}${emit}\n  }\n}\n`;
}

function canon(v: unknown): string { return JSON.stringify(v); }

/** Parse harness output and compare with expected values. */
export function evaluate(text: string, tests: TestCase[]): CaseResult[] {
  const byIdx = new Map<number, string>();
  for (const line of text.split('\n')) {
    const m = /^@@T (\d+) (OK|EXC) (.*)$/.exec(line);
    if (m) byIdx.set(Number(m[1]), m[2] + ' ' + m[3]);
  }
  return tests.map((t, index) => {
    const raw = byIdx.get(index);
    if (raw === undefined) return { index, ok: false, error: 'no result' };
    if (raw.startsWith('EXC ')) return { index, ok: false, error: raw.slice(4) };
    const actual = raw.slice(3);
    let ok = false;
    try { ok = canon(JSON.parse(actual)) === canon(t.expected); } catch { /* malformed */ }
    return { index, ok, actual };
  });
}

/** Parse an ECJ `-log` text file into {line, message}. */
export function parseEcjLog(log: string): { line: number; message: string }[] {
  const out: { line: number; message: string }[] = [];
  for (const block of log.split(/^-{10,}\s*$/m)) {
    const lines = block.split('\n');
    const hi = lines.findIndex(l => /^\s*\d+\.\s+ERROR in .*\(at line \d+\)/.test(l));
    if (hi < 0) continue;
    const line = Number(/\(at line (\d+)\)/.exec(lines[hi])![1]);
    const caret = lines.findIndex((l, i) => i > hi && /^\s*\^+\s*$/.test(l));
    const msg = lines.slice(caret >= 0 ? caret + 1 : hi + 1).map(s => s.trim()).filter(Boolean).join(' ');
    out.push({ line, message: msg || 'compile error' });
  }
  return out;
}
