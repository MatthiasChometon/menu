import type { MailMessage } from '../../../infrastructure/mail/token';

// Wording lives in the domain, never in infrastructure: what we say to somebody
// is a product decision, and the mail layer only carries bytes.
type Locale = 'fr' | 'en';

const WORDING: Record<
  Locale,
  {
    subject: string;
    heading: string;
    lead: string;
    button: string;
    fallback: string;
    ignore: string;
  }
> = {
  fr: {
    subject: 'Réinitialise ton mot de passe',
    heading: 'Nouveau mot de passe',
    lead: 'Choisis un nouveau mot de passe. Ce lien est valable une heure, et ne sert qu’une fois.',
    button: 'Choisir un mot de passe',
    fallback: 'Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :',
    ignore:
      'Tu n’as rien demandé ? Ignore ce message : ton mot de passe actuel reste valable et personne n’a accès à ton compte.',
  },
  en: {
    subject: 'Reset your password',
    heading: 'New password',
    lead: 'Choose a new password. This link lasts one hour and works once.',
    button: 'Choose a password',
    fallback: 'If the button does not work, copy this link into your browser:',
    ignore:
      'Did not ask for this? Ignore the message — your current password still works and nobody has reached your account.',
  },
};

// Everything reaching the HTML is ours or a URL we built, so there is nothing
// to escape. Keep it that way: an email client renders the same HTML a browser
// does, so the day a name goes in, it has to be escaped.
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
      <p style="margin:0 0 8px;font-size:13px;color:#78716c;">${text.fallback}</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#4d7c0f;">${url}</p>
      <p style="margin:0;font-size:13px;color:#78716c;">${text.ignore}</p>
    </td></tr>
  </table>
</body></html>`;

export const passwordResetEmail = (to: string, url: string, locale: string): MailMessage => {
  const text = WORDING[locale === 'en' ? 'en' : 'fr'];

  return {
    to,
    subject: text.subject,
    html: html(text, url),
    // A client that refuses HTML would otherwise show an empty message, and the
    // link has to survive that.
    text: `${text.heading}\n\n${text.lead}\n\n${text.fallback}\n${url}\n\n${text.ignore}\n`,
  };
};
