import type { Locale } from '@kilotrace/shared';

interface CodeTexts {
  subject: string;
  paragraph: string;
  footer: string;
}

/** What the emails say, in each language of the site, with the tone of its texts. */
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
    greeting: (name) => `Ciao ${name},`,
    buttonFallback:
      'Se il pulsante non funziona, copia questo link nel tuo browser:',
    codeExpires: (minutes) => `Questo codice scade tra ${minutes} minuti.`,
    signup: {
      subject: 'Codice di verifica Kilotrace',
      paragraph:
        'Inserisci questo codice nella pagina di registrazione per confermare il tuo indirizzo email e creare il tuo account.',
      footer:
        'Se non ti sei registrato tu, ignora questa email: non verrà creato alcun account.',
    },
    passwordReset: {
      subject: 'Codice di reimpostazione Kilotrace',
      paragraph:
        'Inserisci questo codice per scegliere una nuova password. Non comunicarlo a nessuno.',
      footer:
        'Se non hai chiesto nulla, ignora questa email: la tua password resta invariata.',
    },
    accountExists: {
      subject: 'Hai già un account Kilotrace',
      withPassword: [
        'Qualcuno, probabilmente tu, ha provato a creare un account Kilotrace con questo indirizzo email. Ne hai già uno: accedi con la tua email o il tuo nome utente e la tua password.',
        'Password dimenticata? Puoi sceglierne una nuova dalla pagina di accesso.',
      ],
      withGoogle: [
        'Qualcuno, probabilmente tu, ha provato a creare un account Kilotrace con questo indirizzo email. Ne hai già uno, creato con Google: accedi con il pulsante «Continua con Google».',
        'Preferisci una password? Scegline una da «Password dimenticata» nella pagina di accesso: ti verrà inviato un codice a questo indirizzo.',
      ],
      signIn: 'Accedi',
      continueWithGoogle: 'Continua con Google',
      footer:
        'Se non hai fatto tu questa richiesta, ignora questa email: il tuo account non è cambiato.',
    },
  },
  es: {
    greeting: (name) => `Hola ${name}:`,
    buttonFallback:
      'Si el botón no funciona, copia este enlace en tu navegador:',
    codeExpires: (minutes) => `Este código caduca en ${minutes} minutos.`,
    signup: {
      subject: 'Código de verificación de Kilotrace',
      paragraph:
        'Introduce este código en la página de registro para confirmar tu dirección de correo y crear tu cuenta.',
      footer:
        'Si no te has registrado tú, ignora este correo: no se creará ninguna cuenta.',
    },
    passwordReset: {
      subject: 'Código de restablecimiento de Kilotrace',
      paragraph:
        'Introduce este código para elegir una nueva contraseña. No se lo des a nadie.',
      footer:
        'Si no has pedido nada, ignora este correo: tu contraseña no cambia.',
    },
    accountExists: {
      subject: 'Ya tienes una cuenta de Kilotrace',
      withPassword: [
        'Alguien, probablemente tú, ha intentado crear una cuenta de Kilotrace con esta dirección de correo. Ya tienes una: inicia sesión con tu correo o tu nombre de usuario y tu contraseña.',
        '¿Has olvidado tu contraseña? Puedes elegir una nueva desde la página de inicio de sesión.',
      ],
      withGoogle: [
        'Alguien, probablemente tú, ha intentado crear una cuenta de Kilotrace con esta dirección de correo. Ya tienes una, creada con Google: inicia sesión con el botón «Continuar con Google».',
        '¿Prefieres una contraseña? Elige una desde «Contraseña olvidada» en la página de inicio de sesión: te enviaremos un código a esta dirección.',
      ],
      signIn: 'Iniciar sesión',
      continueWithGoogle: 'Continuar con Google',
      footer:
        'Si no has hecho tú esta solicitud, ignora este correo: tu cuenta no ha cambiado.',
    },
  },
  de: {
    greeting: (name) => `Hallo ${name},`,
    buttonFallback:
      'Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:',
    codeExpires: (minutes) => `Dieser Code läuft in ${minutes} Minuten ab.`,
    signup: {
      subject: 'Kilotrace-Bestätigungscode',
      paragraph:
        'Gib diesen Code auf der Registrierungsseite ein, um deine E-Mail-Adresse zu bestätigen und dein Konto zu erstellen.',
      footer:
        'Falls du dich nicht registriert hast, ignoriere diese E-Mail: Es wird kein Konto erstellt.',
    },
    passwordReset: {
      subject: 'Kilotrace-Code zum Zurücksetzen',
      paragraph:
        'Gib diesen Code ein, um ein neues Passwort zu wählen. Gib ihn an niemanden weiter.',
      footer:
        'Falls du nichts angefordert hast, ignoriere diese E-Mail: Dein Passwort bleibt unverändert.',
    },
    accountExists: {
      subject: 'Du hast bereits ein Kilotrace-Konto',
      withPassword: [
        'Jemand, vermutlich du, wollte mit dieser E-Mail-Adresse ein Kilotrace-Konto erstellen. Du hast bereits eines: Melde dich mit deiner E-Mail-Adresse oder deinem Benutzernamen und deinem Passwort an.',
        'Passwort vergessen? Du kannst auf der Anmeldeseite ein neues wählen.',
      ],
      withGoogle: [
        'Jemand, vermutlich du, wollte mit dieser E-Mail-Adresse ein Kilotrace-Konto erstellen. Du hast bereits eines, erstellt mit Google: Melde dich über den Button „Weiter mit Google“ an.',
        'Lieber ein Passwort? Wähle eines über „Passwort vergessen“ auf der Anmeldeseite: Ein Code wird an diese Adresse gesendet.',
      ],
      signIn: 'Anmelden',
      continueWithGoogle: 'Weiter mit Google',
      footer:
        'Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail: Dein Konto hat sich nicht geändert.',
    },
  },
};
