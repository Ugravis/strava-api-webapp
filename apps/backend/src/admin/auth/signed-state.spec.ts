import { signState, verifyState } from './signed-state';

describe('signed state', () => {
  const secret = 'test-secret';

  it('returns the payload of a state it signed', () => {
    const signed = signState({ state: 's', codeVerifier: 'v' }, secret);
    expect(verifyState(signed, secret)).toEqual({
      state: 's',
      codeVerifier: 'v',
    });
  });

  it('refuses another secret, a changed payload or a malformed value', () => {
    const signed = signState({ state: 's' }, secret);
    const [, signature] = signed.split('.');
    const forged = `${Buffer.from(JSON.stringify({ expiresAt: Date.now() + 60_000, payload: { state: 'x' } })).toString('base64url')}.${signature}`;
    expect(verifyState(signed, 'other-secret')).toBeNull();
    expect(verifyState(forged, secret)).toBeNull();
    expect(verifyState('garbage', secret)).toBeNull();
    expect(verifyState(`${signed}.extra`, secret)).toBeNull();
  });

  it('refuses an expired state', () => {
    jest.useFakeTimers();
    const signed = signState({ state: 's' }, secret);
    jest.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(verifyState(signed, secret)).toBeNull();
    jest.useRealTimers();
  });
});
