import { renderEmail, type RenderedEmail } from './layout';

export type VerificationCodeKind = 'signup' | 'password_reset';

const CONTENT: Record<
  VerificationCodeKind,
  { subject: string; paragraph: string; footer: string }
> = {
  signup: {
    subject: 'Code de vérification Kilotrace',
    paragraph:
      'Saisissez ce code sur la page d’inscription pour confirmer votre adresse email et créer votre compte.',
    footer:
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email : aucun compte ne sera créé.",
  },
  password_reset: {
    subject: 'Code de réinitialisation Kilotrace',
    paragraph:
      'Saisissez ce code pour choisir un nouveau mot de passe. Ne le communiquez à personne.',
    footer:
      "Si vous n'avez rien demandé, ignorez cet email : votre mot de passe reste inchangé.",
  },
};

/** The code opens the subject, so that it can be read from the notification. */
export function verificationCodeTemplate(
  kind: VerificationCodeKind,
  name: string,
  code: string,
  ttlMinutes: number,
): RenderedEmail {
  const content = CONTENT[kind];
  return renderEmail({
    subject: `${code} — ${content.subject}`,
    greeting: `Bonjour ${name},`,
    paragraphs: [content.paragraph],
    code,
    footer: `Ce code expire dans ${ttlMinutes} minutes. ${content.footer}`,
  });
}
