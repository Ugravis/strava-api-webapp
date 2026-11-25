import { renderEmail, type RenderedEmail } from './layout';

/** Sent instead of a code when someone signs up with an address already in use. */
export function accountExistsTemplate(
  name: string,
  loginUrl: string,
): RenderedEmail {
  return renderEmail({
    subject: 'Vous avez déjà un compte Kilotrace',
    greeting: `Bonjour ${name},`,
    paragraphs: [
      'Quelqu’un, sans doute vous, a voulu créer un compte Kilotrace avec cette adresse email. Vous en avez déjà un : connectez-vous avec votre email ou votre pseudo.',
      'Mot de passe oublié ? Vous pourrez en choisir un nouveau depuis la page de connexion.',
    ],
    action: { label: 'Se connecter', url: loginUrl },
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre compte n'a pas changé.",
  });
}
