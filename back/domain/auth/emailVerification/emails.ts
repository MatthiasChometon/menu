import type { MailMessage } from '../../../infrastructure/mail/token';

// The wording lives in the domain, never in infrastructure: what we say to a
// reader is a product decision, and the mail layer only carries bytes.
//
// Written in both languages the site speaks, chosen from the language the
// account was opened in — a verification mail arrives out of nowhere, and one
// in the wrong language reads exactly like a phishing attempt.
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
    subject: 'Confirme ton adresse e-mail',
    heading: 'Plus qu’une étape',
    lead: 'Confirme ton adresse pour activer ton compte et retrouver tes menus sur tous tes appareils.',
    button: 'Confirmer mon adresse',
    fallback: 'Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :',
    ignore:
      'Tu n’es pas à l’origine de cette inscription ? Ignore ce message, aucun compte ne sera activé.',
  },
  en: {
    subject: 'Confirm your email address',
    heading: 'One step left',
    lead: 'Confirm your address to activate your account and find your menus on every device.',
    button: 'Confirm my address',
    fallback: 'If the button does not work, copy this link into your browser:',
    ignore: 'Did not sign up? Ignore this message — no account will be activated.',
  },
};

// Everything that reaches the HTML is either ours or a URL we built, so there
// is nothing to escape here. Keep it that way: the day a name goes in, it has
// to be escaped, because an email client renders the same HTML a browser does.
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

export const verificationEmail = (to: string, url: string, locale: string): MailMessage => {
  const text = WORDING[locale === 'en' ? 'en' : 'fr'];

  return {
    to,
    subject: text.subject,
    html: html(text, url),
    // The plain-text part is not a courtesy: a client that refuses HTML would
    // otherwise show an empty message, and the link has to survive that.
    text: `${text.heading}\n\n${text.lead}\n\n${text.fallback}\n${url}\n\n${text.ignore}\n`,
  };
};
