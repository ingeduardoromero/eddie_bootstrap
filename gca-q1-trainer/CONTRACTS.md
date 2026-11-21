# CONTRACTS

Static site, Vite + TS, Java runs in-browser via CheerpJ 3 (+ ECJ compiler jar). Repo root is the
parent folder; this project lives in `gca-q1-trainer/`; the workflow lives in `../.github/workflows/`.

## Layout
```
problems/NN-slug/problem.json   ProblemSource (src/types.ts)      <- agents A/B
problems/NN-slug/reference.java a CORRECT `int solution(...)` method (method only, no class)
problems/NN-slug/wrong.java     plausible WRONG method, must fail >=1 hidden test (ideally 0 visible fail)
scripts/build-problems.mjs      merges -> src/data/problems.generated.json (hidden tests base64, no solutions)
scripts/validate.ts             real JDK: reference passes all, wrong fails >=1 hidden (uses src/harness.ts)
src/harness.ts                  generateMain(problem, userCode, tests) -> Main.java  (pure TS, no DOM)
src/runner.ts                   CheerpJ lazy loader + compile + run, returns RunOutcome
src/editor.ts  src/toolbar.ts   CodeMirror 6 + sticky key row    src/storage.ts  src/timer.ts  src/main.ts
```

## Problem JSON (see `src/types.ts`)
Method name is always `solution` and is an INSTANCE method (CodeSignal style: `int solution(int[] a)`).
Types allowed: `int`, `long`, `boolean`, `String`, `int[]`. JSON values: number / boolean / string / number[].
`long` values must stay within +-9e15 (JSON-safe). Fields: id, slug, title, difficulty, topic, statement,
returnType, params[{type,name}], examples (exactly 2, with optional explanation), constraints[],
visible (exactly 3), hidden (>=12: empty, single, zero, negatives, max values, all-same, boundaries as relevant).
Expected values must be computed independently/by hand — never copy from running the reference.
Q1 rules: 5-10 line solutions, no HashMap/HashSet/recursion/sorting. No empty arrays unless constraints allow it
(state it in constraints). Strings: ASCII only.

## Harness protocol (src/harness.ts <-> src/runner.ts)
Generated file `Main.java`, single line 1 = `import java.util.*; public class Main {` immediately followed by
the user's code (NO newline) so user line N == javac line N. Harness appended after user code.
Each test i prints/writes one line `@@T <i> OK <json>` or `@@T <i> EXC <ExceptionClass>: <msg>`; results are
written to file `/files/results.txt` in CheerpJ (stdout in the validator). JS compares actual JSON to expected
JSON by deep equality. Compile errors: ECJ `-log` file parsed to `{line,message}`.

## 10 topics (id: topic, difficulty)
1. digit-sum — sum of digits of n >= 0 via %10 and /10 (easy)
2. count-divisible — count elements of int[] divisible by k, loop+condition+counting (easy)
3. count-vowels — String `s`, count vowels a,e,i,o,u (any case) using charAt (easy)
4. range-of-array — max minus min of non-empty int[], min/max tracking (standard)
5. reverse-number — reverse the digits of n in [0,10^9] building by append (123->321, 120->21) (standard)
6. longest-increasing-run — length of longest strictly increasing contiguous run, adjacent comparison (standard)
7. compress-string — "aaabcc" -> "a3bc2" (run lengths >1 appended) using StringBuilder/charAt (standard)
8. second-largest-distinct — second largest DISTINCT value, -1 if none; duplicates/all-same/single/negatives (tricky)
9. count-overlapping — occurrences of non-empty `p` in `s` INCLUDING overlaps, via indexOf/substring (tricky)
10. insert-digit-max — int n (may be negative, |n|<=10^9) and digit d in 0..9: insert d anywhere (not removing/reordering)
    to get the largest possible number; return as long (place-value building; negatives reverse the logic) (tricky)

Ramp: 1-3 easy, 4-7 standard, 8-10 tricky.
