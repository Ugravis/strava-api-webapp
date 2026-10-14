import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import mailConfig, { type MailConfig } from '../config/mail.config';
import type { RenderedEmail } from './templates/layout';
import { passwordResetTemplate } from './templates/password-reset.template';

interface Recipient {
  email: string;
  displayName: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(@Inject(mailConfig.KEY) private readonly config: MailConfig) {
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

  sendPasswordReset(recipient: Recipient, url: string): Promise<void> {
    return this.send(
      recipient,
      passwordResetTemplate(recipient.displayName, url),
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
        `Failed to send "${email.subject}" email`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
