import { renderActionEmail, type RenderedEmail } from './layout';

export function passwordResetTemplate(
  name: string,
  url: string,
): RenderedEmail {
  return renderActionEmail({
    subject: 'Réinitialisez votre mot de passe',
    greeting: `Bonjour ${name},`,
    paragraphs: [
      'Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
    ],
    actionLabel: 'Choisir un nouveau mot de passe',
    actionUrl: url,
    footer:
      "Ce lien expire dans 1 heure. Si vous n'avez rien demandé, ignorez cet email : votre mot de passe reste inchangé.",
  });
}
