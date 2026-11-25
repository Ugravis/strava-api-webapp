import { renderEmail, type RenderedEmail } from './layout';

/**
 * Sent instead of a code when someone signs up with an address already in
 * use. Only the owner of the mailbox reads it, so it may tell how to sign in.
 */
export function accountExistsTemplate(
  name: string,
  loginUrl: string,
  hasPassword: boolean,
): RenderedEmail {
  const paragraphs = hasPassword
    ? [
        'Quelqu’un, sans doute vous, a voulu créer un compte Kilotrace avec cette adresse email. Vous en avez déjà un : connectez-vous avec votre email ou votre pseudo et votre mot de passe.',
        'Mot de passe oublié ? Vous pourrez en choisir un nouveau depuis la page de connexion.',
      ]
    : [
        'Quelqu’un, sans doute vous, a voulu créer un compte Kilotrace avec cette adresse email. Vous en avez déjà un, créé avec Google : connectez-vous avec le bouton « Continuer avec Google ».',
        'Vous préférez un mot de passe ? Choisissez-en un depuis « Mot de passe oublié » sur la page de connexion : un code vous sera envoyé à cette adresse.',
      ];
  return renderEmail({
    subject: 'Vous avez déjà un compte Kilotrace',
    greeting: `Bonjour ${name},`,
    paragraphs,
    action: {
      label: hasPassword ? 'Se connecter' : 'Se connecter avec Google',
      url: loginUrl,
    },
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre compte n'a pas changé.",
  });
}
