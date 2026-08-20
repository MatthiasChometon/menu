import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

// Typed explicitly: without the generic, sendMail returns any and every caller
// silently loses its typing.
export type MailTransport = Transporter<SMTPTransport.SentMessageInfo>;
