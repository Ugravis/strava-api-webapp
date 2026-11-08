import { PasswordHasher } from './password-hasher.service';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('verifies a password against its hash', async () => {
    const hash = await hasher.hash('correct horse battery staple');
    await expect(
      hasher.verify('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('correct horse battery staple');
    await expect(hasher.verify('wrong password', hash)).resolves.toBe(false);
  });

  it('salts each hash', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('same password'),
      hasher.hash('same password'),
    ]);
    expect(first).not.toBe(second);
  });

  it('rejects a malformed hash', async () => {
    await expect(hasher.verify('password', 'not-a-hash')).resolves.toBe(false);
  });
});
