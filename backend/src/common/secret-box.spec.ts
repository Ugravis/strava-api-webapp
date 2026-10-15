import { SecretBox } from './secret-box';

describe('SecretBox', () => {
  const box = new SecretBox('test-secret');

  it('decrypts what it encrypted', () => {
    const encrypted = box.encrypt('strava-refresh-token');
    expect(encrypted).not.toContain('strava-refresh-token');
    expect(box.decrypt(encrypted)).toBe('strava-refresh-token');
  });

  it('uses a random IV', () => {
    expect(box.encrypt('same')).not.toBe(box.encrypt('same'));
  });

  it('rejects a payload encrypted with another secret', () => {
    const encrypted = new SecretBox('other-secret').encrypt('token');
    expect(() => box.decrypt(encrypted)).toThrow();
  });

  it('rejects a tampered payload', () => {
    const [version, iv, tag] = box.encrypt('token').split('.');
    expect(() => box.decrypt(`${version}.${iv}.${tag}.AAAA`)).toThrow();
  });
});
