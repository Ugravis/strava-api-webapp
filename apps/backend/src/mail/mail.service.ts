import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { type Locale, VERIFICATION_CODE_TTL_MINUTES } from '@kilotrace/shared';
import authConfig, { type AuthConfig } from '../config/auth.config';
import mailConfig, { type MailConfig } from '../config/mail.config';
import { accountExistsTemplate } from './templates/account-exists.template';
import type { RenderedEmail } from './templates/layout';
import { verificationCodeTemplate } from './templates/verification-code.template';

interface Recipient {
  email: string;
  username: string;
  displayName: string | null;
  /** The language of the account, or the one of the site at sign-up. */
  locale: Locale;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(
    @Inject(mailConfig.KEY) private readonly config: MailConfig,
    @Inject(authConfig.KEY) private readonly authSettings: AuthConfig,
  ) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.password
          ? { user: config.user, pass: config.password }
          : undefined,
    });
  }

  sendSignupCode(recipient: Recipient, code: string): Promise<void> {
    return this.send(
      recipient,
      verificationCodeTemplate(
        recipient.locale,
        'signup',
        nameOf(recipient),
        code,
        VERIFICATION_CODE_TTL_MINUTES,
      ),
    );
  }

  sendPasswordResetCode(recipient: Recipient, code: string): Promise<void> {
    return this.send(
      recipient,
      verificationCodeTemplate(
        recipient.locale,
        'password_reset',
        nameOf(recipient),
        code,
        VERIFICATION_CODE_TTL_MINUTES,
      ),
    );
  }

  /** `hasPassword` false: an account opened with Google only, which signs in with it. */
  sendAccountExists(recipient: Recipient, hasPassword: boolean): Promise<void> {
    return this.send(
      recipient,
      accountExistsTemplate(
        recipient.locale,
        nameOf(recipient),
        this.authSettings.frontendUrl,
        hasPassword,
      ),
    );
  }

  /** Delivery failures are logged, never propagated: they must not break the calling flow. */
  private async send(
    recipient: Recipient,
    email: RenderedEmail,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: recipient.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (error) {
      this.logger.error(
        // The subject may hold a code: never logged.
        'Failed to send an email',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function nameOf(recipient: Recipient): string {
  return recipient.displayName ?? recipient.username;
}
