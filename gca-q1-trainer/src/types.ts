export type JType = 'int' | 'long' | 'boolean' | 'String' | 'int[]';
export type JValue = number | boolean | string | number[];

export interface Param { type: JType; name: string }
export interface TestCase { args: JValue[]; expected: JValue }
export interface Example extends TestCase { explanation?: string }

/** Authoring format: problems/NN-slug/problem.json */
export interface ProblemSource {
  id: number; slug: string; title: string;
  difficulty: 'easy' | 'standard' | 'tricky';
  topic: string;
  statement: string;            // plain text, \n paragraphs; `code` allowed
  returnType: JType;
  params: Param[];
  examples: Example[];          // exactly 2
  constraints: string[];
  visible: TestCase[];          // exactly 3
  hidden: TestCase[];           // >= 10
}

/** Shipped format (src/data/problems.generated.json): no reference/wrong, hidden base64 */
export interface Problem extends Omit<ProblemSource, 'hidden'> {
  hiddenB64: string;            // base64(utf8(JSON.stringify(TestCase[])))
  hiddenCount: number;
}

export interface CaseResult { index: number; ok: boolean; actual?: string; error?: string }
export type RunOutcome =
  | { kind: 'compile_error'; errors: { line: number; message: string }[]; raw: string }
  | { kind: 'timeout' }
  | { kind: 'ok'; results: CaseResult[] }
  | { kind: 'internal_error'; message: string };
