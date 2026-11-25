import type { Locale } from '@kilotrace/shared';

interface CodeTexts {
  subject: string;
  paragraph: string;
  footer: string;
}

/** What the emails say, in each language of the site, addressing the reader formally as the site does. */
export interface EmailTexts {
  greeting: (name: string) => string;
  /** Above the link spelled out under a button. */
  buttonFallback: string;
  codeExpires: (minutes: number) => string;
  signup: CodeTexts;
  passwordReset: CodeTexts;
  accountExists: {
    subject: string;
    withPassword: string[];
    withGoogle: string[];
    signIn: string;
    continueWithGoogle: string;
    footer: string;
  };
}

export const EMAIL_TEXTS: Record<Locale, EmailTexts> = {
  fr: {
    greeting: (name) => `Bonjour ${name},`,
    buttonFallback:
      'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    codeExpires: (minutes) => `Ce code expire dans ${minutes} minutes.`,
    signup: {
      subject: 'Code de vérification Kilotrace',
      paragraph:
        'Saisissez ce code sur la page d’inscription pour confirmer votre adresse email et créer votre compte.',
      footer:
        "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email : aucun compte ne sera créé.",
    },
    passwordReset: {
      subject: 'Code de réinitialisation Kilotrace',
      paragraph:
        'Saisissez ce code pour choisir un nouveau mot de passe. Ne le communiquez à personne.',
      footer:
        "Si vous n'avez rien demandé, ignorez cet email : votre mot de passe reste inchangé.",
    },
    accountExists: {
      subject: 'Vous avez déjà un compte Kilotrace',
      withPassword: [
        'Quelqu’un, sans doute vous, a voulu créer un compte Kilotrace avec cette adresse email. Vous en avez déjà un : connectez-vous avec votre email ou votre pseudo et votre mot de passe.',
        'Mot de passe oublié ? Vous pourrez en choisir un nouveau depuis la page de connexion.',
      ],
      withGoogle: [
        'Quelqu’un, sans doute vous, a voulu créer un compte Kilotrace avec cette adresse email. Vous en avez déjà un, créé avec Google : connectez-vous avec le bouton « Continuer avec Google ».',
        'Vous préférez un mot de passe ? Choisissez-en un depuis « Mot de passe oublié » sur la page de connexion : un code vous sera envoyé à cette adresse.',
      ],
      signIn: 'Se connecter',
      continueWithGoogle: 'Continuer avec Google',
      footer:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre compte n'a pas changé.",
    },
  },
  en: {
    greeting: (name) => `Hello ${name},`,
    buttonFallback:
      'If the button does not work, copy this link into your browser:',
    codeExpires: (minutes) => `This code expires in ${minutes} minutes.`,
    signup: {
      subject: 'Kilotrace verification code',
      paragraph:
        'Enter this code on the sign-up page to confirm your email address and create your account.',
      footer:
        'If you did not sign up, ignore this email: no account will be created.',
    },
    passwordReset: {
      subject: 'Kilotrace reset code',
      paragraph:
        'Enter this code to choose a new password. Do not share it with anyone.',
      footer:
        'If you did not ask for anything, ignore this email: your password stays the same.',
    },
    accountExists: {
      subject: 'You already have a Kilotrace account',
      withPassword: [
        'Someone, probably you, tried to create a Kilotrace account with this email address. You already have one: sign in with your email or username and your password.',
        'Forgot your password? You can choose a new one from the sign-in page.',
      ],
      withGoogle: [
        'Someone, probably you, tried to create a Kilotrace account with this email address. You already have one, created with Google: sign in with the “Continue with Google” button.',
        'Prefer a password? Choose one from “Forgot password” on the sign-in page: a code will be sent to this address.',
      ],
      signIn: 'Sign in',
      continueWithGoogle: 'Continue with Google',
      footer:
        'If you did not make this request, ignore this email: your account has not changed.',
    },
  },
  it: {
    greeting: (name) => `Buongiorno ${name},`,
    buttonFallback:
      'Se il pulsante non funziona, copi questo link nel Suo browser:',
    codeExpires: (minutes) => `Questo codice scade tra ${minutes} minuti.`,
    signup: {
      subject: 'Codice di verifica Kilotrace',
      paragraph:
        'Inserisca questo codice nella pagina di registrazione per confermare il Suo indirizzo email e creare il Suo account.',
      footer:
        'Se non si è registrato Lei, ignori questa email: non verrà creato alcun account.',
    },
    passwordReset: {
      subject: 'Codice di reimpostazione Kilotrace',
      paragraph:
        'Inserisca questo codice per scegliere una nuova password. Non lo comunichi a nessuno.',
      footer:
        'Se non ha richiesto nulla, ignori questa email: la Sua password resta invariata.',
    },
    accountExists: {
      subject: 'Ha già un account Kilotrace',
      withPassword: [
        'Qualcuno, probabilmente Lei, ha provato a creare un account Kilotrace con questo indirizzo email. Ne ha già uno: acceda con la Sua email o il Suo nome utente e la Sua password.',
        'Password dimenticata? Può sceglierne una nuova dalla pagina di accesso.',
      ],
      withGoogle: [
        'Qualcuno, probabilmente Lei, ha provato a creare un account Kilotrace con questo indirizzo email. Ne ha già uno, creato con Google: acceda con il pulsante «Continua con Google».',
        'Preferisce una password? Ne scelga una da «Password dimenticata» nella pagina di accesso: Le verrà inviato un codice a questo indirizzo.',
      ],
      signIn: 'Accedi',
      continueWithGoogle: 'Continua con Google',
      footer:
        'Se non ha fatto Lei questa richiesta, ignori questa email: il Suo account non è cambiato.',
    },
  },
  es: {
    greeting: (name) => `Hola, ${name}:`,
    buttonFallback:
      'Si el botón no funciona, copie este enlace en su navegador:',
    codeExpires: (minutes) => `Este código caduca en ${minutes} minutos.`,
    signup: {
      subject: 'Código de verificación de Kilotrace',
      paragraph:
        'Introduzca este código en la página de registro para confirmar su dirección de correo y crear su cuenta.',
      footer:
        'Si no se ha registrado usted, ignore este correo: no se creará ninguna cuenta.',
    },
    passwordReset: {
      subject: 'Código de restablecimiento de Kilotrace',
      paragraph:
        'Introduzca este código para elegir una nueva contraseña. No se lo dé a nadie.',
      footer:
        'Si no ha pedido nada, ignore este correo: su contraseña no cambia.',
    },
    accountExists: {
      subject: 'Ya tiene una cuenta de Kilotrace',
      withPassword: [
        'Alguien, probablemente usted, ha intentado crear una cuenta de Kilotrace con esta dirección de correo. Ya tiene una: inicie sesión con su correo o su nombre de usuario y su contraseña.',
        '¿Ha olvidado su contraseña? Puede elegir una nueva desde la página de inicio de sesión.',
      ],
      withGoogle: [
        'Alguien, probablemente usted, ha intentado crear una cuenta de Kilotrace con esta dirección de correo. Ya tiene una, creada con Google: inicie sesión con el botón «Continuar con Google».',
        '¿Prefiere una contraseña? Elija una desde «Contraseña olvidada» en la página de inicio de sesión: le enviaremos un código a esta dirección.',
      ],
      signIn: 'Iniciar sesión',
      continueWithGoogle: 'Continuar con Google',
      footer:
        'Si no ha hecho usted esta solicitud, ignore este correo: su cuenta no ha cambiado.',
    },
  },
  de: {
    greeting: (name) => `Guten Tag ${name},`,
    buttonFallback:
      'Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:',
    codeExpires: (minutes) => `Dieser Code läuft in ${minutes} Minuten ab.`,
    signup: {
      subject: 'Kilotrace-Bestätigungscode',
      paragraph:
        'Geben Sie diesen Code auf der Registrierungsseite ein, um Ihre E-Mail-Adresse zu bestätigen und Ihr Konto zu erstellen.',
      footer:
        'Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail: Es wird kein Konto erstellt.',
    },
    passwordReset: {
      subject: 'Kilotrace-Code zum Zurücksetzen',
      paragraph:
        'Geben Sie diesen Code ein, um ein neues Passwort zu wählen. Geben Sie ihn an niemanden weiter.',
      footer:
        'Falls Sie nichts angefordert haben, ignorieren Sie diese E-Mail: Ihr Passwort bleibt unverändert.',
    },
    accountExists: {
      subject: 'Sie haben bereits ein Kilotrace-Konto',
      withPassword: [
        'Jemand, vermutlich Sie, wollte mit dieser E-Mail-Adresse ein Kilotrace-Konto erstellen. Sie haben bereits eines: Melden Sie sich mit Ihrer E-Mail-Adresse oder Ihrem Benutzernamen und Ihrem Passwort an.',
        'Passwort vergessen? Sie können auf der Anmeldeseite ein neues wählen.',
      ],
      withGoogle: [
        'Jemand, vermutlich Sie, wollte mit dieser E-Mail-Adresse ein Kilotrace-Konto erstellen. Sie haben bereits eines, erstellt mit Google: Melden Sie sich über die Schaltfläche „Weiter mit Google“ an.',
        'Lieber ein Passwort? Wählen Sie eines über „Passwort vergessen“ auf der Anmeldeseite: Ein Code wird an diese Adresse gesendet.',
      ],
      signIn: 'Anmelden',
      continueWithGoogle: 'Weiter mit Google',
      footer:
        'Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail: Ihr Konto hat sich nicht geändert.',
    },
  },
};
