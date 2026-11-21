export const LIMIT_MS = 10 * 60 * 1000;
/** Wall-clock based 10-min countdown per problem (survives reload via `start` timestamp). */
export function remaining(start: number | undefined, now = Date.now()): number {
  return start === undefined ? LIMIT_MS : Math.max(0, LIMIT_MS - (now - start));
}
export const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
