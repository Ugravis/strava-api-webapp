import {
  USERNAME_PATTERN,
  usernameBaseFromEmail,
  withNumericSuffix,
} from './username.util';

describe('usernameBaseFromEmail', () => {
  it.each([
    ['jean.dupont@gmail.com', 'jean_dupont'],
    ['Jean.Dupont+strava@gmail.com', 'jean_dupont'],
    ['élodie-martin@example.fr', 'elodie_martin'],
    ['a@b.c', 'a_run'],
    ['...@b.c', 'runner'],
    ['averyveryverylongemailaddress@b.c', 'averyveryverylongema'],
  ])('derives %s into %s', (email, expected) => {
    const username = usernameBaseFromEmail(email);
    expect(username).toBe(expected);
    expect(username).toMatch(USERNAME_PATTERN);
  });
});

describe('withNumericSuffix', () => {
  it('appends the suffix', () => {
    expect(withNumericSuffix('jean', 2)).toBe('jean2');
  });

  it('truncates the base to stay within the maximum length', () => {
    expect(withNumericSuffix('averyveryverylongema', 12)).toBe(
      'averyveryverylonge12',
    );
  });
});
