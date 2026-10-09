// Small checks shared by the save's validation and its migrations.
export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
