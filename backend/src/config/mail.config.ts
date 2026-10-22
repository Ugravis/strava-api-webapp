import { registerAs } from '@nestjs/config';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  from: string;
}

export default registerAs('mail', (): MailConfig => ({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || null,
  password: process.env.SMTP_PASSWORD || null,
  from: process.env.MAIL_FROM ?? 'Kilotrace <no-reply@localhost>',
}));
