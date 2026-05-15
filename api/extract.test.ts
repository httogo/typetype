import { describe, expect, test } from 'vitest';
import { validateExtractUrl } from './extract';

describe('validateExtractUrl', () => {
  test('accepts public http and https URLs', () => {
    expect(validateExtractUrl('https://example.com/article').ok).toBe(true);
    expect(validateExtractUrl('http://standardebooks.org/ebooks/a/b').ok).toBe(true);
  });

  test('rejects non-http protocols', () => {
    const result = validateExtractUrl('file:///etc/passwd');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('http');
  });

  test('rejects localhost names', () => {
    expect(validateExtractUrl('http://localhost:5173').ok).toBe(false);
    expect(validateExtractUrl('http://app.localhost:5173').ok).toBe(false);
  });

  test('rejects private and link-local IPv4 ranges', () => {
    expect(validateExtractUrl('http://127.0.0.1').ok).toBe(false);
    expect(validateExtractUrl('http://10.0.0.2').ok).toBe(false);
    expect(validateExtractUrl('http://172.16.0.5').ok).toBe(false);
    expect(validateExtractUrl('http://172.31.255.255').ok).toBe(false);
    expect(validateExtractUrl('http://192.168.1.1').ok).toBe(false);
    expect(validateExtractUrl('http://169.254.1.1').ok).toBe(false);
  });

  test('rejects localhost IPv6', () => {
    expect(validateExtractUrl('http://[::1]/').ok).toBe(false);
  });
});
