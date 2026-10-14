import { renderActionEmail, type RenderedEmail } from './layout';

export function emailVerificationTemplate(
  displayName: string,
  url: string,
): RenderedEmail {
  return renderActionEmail({
    subject: 'Confirme ton adresse email',
    greeting: `Bonjour ${displayName},`,
    paragraphs: [
      'Bienvenue ! Pour finaliser ton inscription, confirme ton adresse email.',
    ],
    actionLabel: 'Confirmer mon adresse',
    actionUrl: url,
    footer:
      "Ce lien expire dans 24 heures. Si tu n'es pas à l'origine de cette inscription, ignore cet email.",
  });
}
