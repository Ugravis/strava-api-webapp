import { renderActionEmail, type RenderedEmail } from './layout';

export function passwordResetTemplate(
  displayName: string,
  url: string,
): RenderedEmail {
  return renderActionEmail({
    subject: 'Réinitialise ton mot de passe',
    greeting: `Bonjour ${displayName},`,
    paragraphs: [
      'Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.',
    ],
    actionLabel: 'Choisir un nouveau mot de passe',
    actionUrl: url,
    footer:
      "Ce lien expire dans 1 heure. Si tu n'as rien demandé, ignore cet email : ton mot de passe reste inchangé.",
  });
}
