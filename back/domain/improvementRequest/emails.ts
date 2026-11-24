import type { MailMessage } from '../../infrastructure/mail/token';
import type { SuggestionContext } from './type';

// Written for whoever maintains the site: what is needed to weigh an idea and
// nothing else. Everything interpolated comes from a person, so it is escaped —
// an email client renders the same HTML a browser does.
const escape = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const IMPORTANCE_LABEL: Record<string, string> = {
  NICE_TO_HAVE: 'Ce serait sympa',
  WOULD_HELP: 'Ça aiderait',
  IMPORTANT: 'Important',
};

export const improvementRequestEmail = (
  to: string,
  importance: string,
  message: string,
  context: SuggestionContext,
  requestedBy: string,
  filedToday: number,
): MailMessage => {
  const label = IMPORTANCE_LABEL[importance] ?? importance;
  const lines = [
    ['Importance', label],
    ['Page', context.page],
    ['Proposé par', requestedBy],
    ['Propositions de ce compte en 24 h', String(filedToday)],
    ['Écran', context.viewport],
    ['Langue', context.locale],
    ['Navigateur', context.userAgent],
  ] as const;

  const rows = lines
    .map(
      ([name, value]): string =>
        `<tr><td style="padding:2px 12px 2px 0;color:#78716c;white-space:nowrap;">${name}</td><td style="padding:2px 0;">${escape(value)}</td></tr>`,
    )
    .join('');

  return {
    to,
    subject: `[menu] Idée — ${message.slice(0, 60)}`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
  <p style="margin:0 0 16px;white-space:pre-wrap;font-size:16px;line-height:1.6;">${escape(message)}</p>
  <table style="border-collapse:collapse;font-size:13px;">${rows}</table>
</body></html>`,
    text: `${message}\n\n${lines.map(([name, value]): string => `${name} : ${value}`).join('\n')}\n`,
  };
};
