import { describe, it, expect } from 'vitest';
import { parseTokens, isAllowedKey, isTokenValid, ALLOWED_KEYS } from '../src/utils/queryParser';

describe('queryParser', () => {
  it('parses key:value without space', () => {
    const tokens = parseTokens('pib:12345678');
    expect(tokens).toEqual([{ key: 'pib', value: '12345678', raw: 'pib:12345678' }]);
  });

  it('parses key: value with space', () => {
    const tokens = parseTokens('pib: 12345678');
    expect(tokens).toEqual([{ key: 'pib', value: '12345678', raw: 'pib: 12345678' }]);
  });

  it('normalizes key casing', () => {
    const tokens = parseTokens('PIB:12345678');
    expect(tokens[0].key).toBe('pib');
  });

  it('validates pib as 8-9 digits', () => {
    const [t] = parseTokens('pib:12345678');
    expect(isTokenValid(t)).toBe(true);
    const [t2] = parseTokens('pib:abcd');
    expect(isTokenValid(t2)).toBe(false);
  });

  it('validates iznos operators and decimals', () => {
    const good = ['iznos:>50000', 'iznos:12000', 'iznos:=0', 'iznos:12,5'];
    for (const q of good) {
      const [t] = parseTokens(q);
      expect(isTokenValid(t)).toBe(true);
    }
    const [bad] = parseTokens('iznos:>abc');
    expect(isTokenValid(bad)).toBe(false);
  });

  it('validates datum patterns', () => {
    const good = ['datum:2025', 'datum:2025-10', 'datum:2025-10-02'];
    for (const q of good) {
      const [t] = parseTokens(q);
      expect(isTokenValid(t)).toBe(true);
    }
    const [bad] = parseTokens('datum:2025-13');
    expect(isTokenValid(bad)).toBe(false);
    const [badDay] = parseTokens('datum:2025-02-32');
    expect(isTokenValid(badDay)).toBe(false);
  });

  it('unknown key is not allowed', () => {
    const [t] = parseTokens('nepoznato:vrednost');
    expect(isAllowedKey(t.key)).toBe(false);
    expect(isTokenValid(t)).toBe(false);
  });

  it('ignores free text without key', () => {
    const tokens = parseTokens('samoTekst status:poslato');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].key).toBe('status');
  });

  it('includes all allowed keys lower-case', () => {
    for (const k of ALLOWED_KEYS) {
      expect(k).toBe(k.toLowerCase());
    }
  });
});
