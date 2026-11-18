export const pct = (u: number, digits = 1) => Number.isFinite(u) ? `${(u * 100).toFixed(digits)}%` : '—';
