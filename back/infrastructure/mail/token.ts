import type { Transporter } from 'nodemailer';

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/** A rendered message, ready to send. Who it is for and what it says are the
 *  sender's business — this layer only carries it. */
export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// Null when no server is configured, which a local checkout is allowed to be:
// the service then writes the message to the log instead of dropping it.
export type MailTransport = Transporter | null;
