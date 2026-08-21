import { describe, expect, it } from 'vitest';
import { isValidUrl, fmtDate, URL_PATTERN } from '../format';

describe('isValidUrl', () => {
  it.each([
    'https://example.com',
    'http://example.com',
    'https://sub.example.com/path?q=1',
    'https://example.io:8080/api',
  ])('accepts valid http(s) url: %s', (u) => {
    expect(isValidUrl(u)).toBe(true);
  });

  it.each([
    '',
    'javascript:alert(1)',
    'data:text/html,evil',
    'ftp://example.com',
    'example.com',
    '//example.com',
    'https://',
  ])('rejects invalid/dangerous url: %s', (u) => {
    expect(isValidUrl(u)).toBe(false);
  });
});

describe('fmtDate', () => {
  it('formats plain date without timezone drift', () => {
    expect(fmtDate('2026-08-19')).toBe('08-19');
  });

  it('formats ISO datetime to local date+time when requested', () => {
    const out = fmtDate('2026-01-05T23:30:00Z', true);
    expect(out).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('returns empty string for nullish input', () => {
    expect(fmtDate(null)).toBe('');
    expect(fmtDate(undefined)).toBe('');
    expect(fmtDate('')).toBe('');
  });

  it('falls back to raw slice on unparseable input instead of throwing', () => {
    expect(fmtDate('not-a-date')).toBe('not-a');
  });
});

describe('URL_PATTERN', () => {
  it('requires a dot in the host (blocks bare words)', () => {
    expect(URL_PATTERN.test('https://localhost')).toBe(false);
  });
});
