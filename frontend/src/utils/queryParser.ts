export type QueryToken = { key: string; value: string; raw: string };

export const ALLOWED_KEYS = ['broj', 'pib', 'status', 'datum', 'iznos', 'changed'] as const;
export type AllowedKey = typeof ALLOWED_KEYS[number];

export const VALIDATORS: Partial<Record<AllowedKey, (v: string) => boolean>> = {
  // 2025 | 2025-10 | 2025-10-02 with basic month/day ranges
  datum: (v) => /^(\d{4})(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/.test(v),
  iznos: (v) => /^(>=|<=|>|<|=)?\s*\d+([.,]\d+)?$/.test(v),
  pib: (v) => /^\d{8,9}$/.test(v),
};

export function isAllowedKey(key: string): key is AllowedKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key as AllowedKey);
}

export function isTokenValid(t: QueryToken): boolean {
  if (!isAllowedKey(t.key)) return false;
  const validator = VALIDATORS[t.key];
  return validator ? validator(t.value) : true;
}

// Supports both "key:value" and "key: value"; lower-cases keys
export function parseTokens(query: string): QueryToken[] {
  const parts = query.trim().split(/\s+/);
  const tokens: QueryToken[] = [];
  for (let i = 0; i < parts.length; i++) {
    const curr = parts[i];
    if (!curr) continue;
    if (curr.includes(':')) {
      const [k, vInitial] = curr.split(':');
      const key = (k || '').trim().toLowerCase();
      const v = (vInitial || '').trim();
      if (!v && parts[i + 1]) {
        const next = parts[i + 1].trim();
        if (next && !next.includes(':')) {
          tokens.push({ key, value: next, raw: `${curr} ${next}` });
          i++;
          continue;
        }
      }
      if (v) tokens.push({ key, value: v, raw: curr });
    }
  }
  return tokens;
}
