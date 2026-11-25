import { localePath, type Locale } from '@kilotrace/shared';
import { renderEmail, type RenderedEmail } from './layout';
import { EMAIL_TEXTS } from './texts';

/**
 * Sent instead of a code when someone signs up with an address already in
 * use. Only the owner of the mailbox reads it, so it may tell how to sign in.
 */
export function accountExistsTemplate(
  locale: Locale,
  name: string,
  frontendUrl: string,
  hasPassword: boolean,
): RenderedEmail {
  const texts = EMAIL_TEXTS[locale].accountExists;
  return renderEmail({
    locale,
    subject: texts.subject,
    greeting: EMAIL_TEXTS[locale].greeting(name),
    paragraphs: hasPassword ? texts.withPassword : texts.withGoogle,
    action: hasPassword
      ? {
          label: texts.signIn,
          url: new URL(localePath(locale, '/login'), frontendUrl).toString(),
        }
      : {
          // Starts the Google sign-in at once, as the button of the app does.
          label: texts.continueWithGoogle,
          url: new URL('/api/auth/google', frontendUrl).toString(),
          google: {
            iconUrl: new URL('/email/google.png', frontendUrl).toString(),
          },
        },
    footer: texts.footer,
  });
}
