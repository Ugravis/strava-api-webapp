import { accountExistsTemplate } from './account-exists.template';
import { verificationCodeTemplate } from './verification-code.template';

describe('email templates', () => {
  it('writes a code email in the language of its recipient', () => {
    const email = verificationCodeTemplate(
      'de',
      'signup',
      'Jean',
      '123456',
      15,
    );

    expect(email.subject).toBe('123456 — Kilotrace-Bestätigungscode');
    expect(email.html).toContain('<html lang="de">');
    expect(email.text).toContain('Hallo Jean,');
    expect(email.text).toContain('Dieser Code läuft in 15 Minuten ab.');
  });

  it('links to the sign-in page of the language, prefixed unless English', () => {
    const french = accountExistsTemplate(
      'fr',
      'Jean',
      'https://kilotrace.app',
      true,
    );
    const english = accountExistsTemplate(
      'en',
      'Jean',
      'https://kilotrace.app',
      true,
    );

    expect(french.text).toContain(
      'Se connecter: https://kilotrace.app/fr/login',
    );
    expect(english.text).toContain('Sign in: https://kilotrace.app/login');
  });
});
