import type { Locale } from '@kilotrace/shared';
import { renderEmail, type RenderedEmail } from './layout';
import { EMAIL_TEXTS } from './texts';

export type VerificationCodeKind = 'signup' | 'password_reset';

/** The code opens the subject, so that it can be read from the notification. */
export function verificationCodeTemplate(
  locale: Locale,
  kind: VerificationCodeKind,
  name: string,
  code: string,
  ttlMinutes: number,
): RenderedEmail {
  const texts = EMAIL_TEXTS[locale];
  const content = kind === 'signup' ? texts.signup : texts.passwordReset;
  return renderEmail({
    locale,
    subject: `${code} — ${content.subject}`,
    greeting: texts.greeting(name),
    paragraphs: [content.paragraph],
    code,
    footer: `${texts.codeExpires(ttlMinutes)} ${content.footer}`,
  });
}
