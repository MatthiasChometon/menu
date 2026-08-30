import type { MailMessage } from '../../../infrastructure/mail/token';

// Sent when somebody tries to register an address that already has an account.
// The registration route answers the same 202 either way, so a stranger cannot
// tell a free address from a taken one by its response; the only thing that
// differs is this message, and it reaches the address's real owner alone. So it
// is written for them: not "you signed up" — they may not have — but "somebody
// tried, and here is what to do if it was you."
type Locale = 'fr' | 'en';

const WORDING: Record<
  Locale,
  { subject: string; heading: string; lead: string; button: string; ignore: string }
> = {
  fr: {
    subject: 'Tu as déjà un compte',
    heading: 'Ce compte existe déjà',
    lead: 'Quelqu’un vient d’essayer de créer un compte avec ton adresse. Il en existe déjà un — connecte-toi, ou réinitialise ton mot de passe si tu l’as oublié.',
    button: 'Aller à la connexion',
    ignore:
      'Ce n’est pas toi ? Aucun nouveau compte n’a été créé et rien n’a changé — tu peux ignorer ce message.',
  },
  en: {
    subject: 'You already have an account',
    heading: 'This account already exists',
    lead: 'Someone just tried to create an account with your address. One already exists — sign in, or reset your password if you have forgotten it.',
    button: 'Go to sign in',
    ignore:
      'Not you? No new account was created and nothing changed — you can ignore this message.',
  },
};

// Same rule as the verification mail: everything here is ours or a URL we built,
// so there is nothing to escape. The day a name goes in, it must be escaped —
// an email client renders the same HTML a browser does.
const html = (text: (typeof WORDING)[Locale], url: string): string => `
<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <tr><td>
      <h1 style="margin:0 0 16px;font-size:22px;">${text.heading}</h1>
      <p style="margin:0 0 24px;line-height:1.6;color:#44403c;">${text.lead}</p>
      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;background:#4d7c0f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600;">${text.button}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#78716c;">${text.ignore}</p>
    </td></tr>
  </table>
</body></html>`;

export const accountExistsEmail = (to: string, locale: string, frontUrl: string): MailMessage => {
  const text = WORDING[locale === 'en' ? 'en' : 'fr'];

  return {
    to,
    subject: text.subject,
    html: html(text, frontUrl),
    text: `${text.heading}\n\n${text.lead}\n\n${frontUrl}\n\n${text.ignore}\n`,
  };
};
