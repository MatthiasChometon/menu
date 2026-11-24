import type { MailMessage } from '../../infrastructure/mail/token';
import type { ReportContext } from './type';

// Written for one reader — whoever maintains the site — so it says what is
// needed to act and nothing else. No greeting, no branding: this is a notice,
// not a newsletter.
//
// Everything interpolated here comes from a person, so it is escaped. An email
// client renders the same HTML a browser does, and a report is the one place
// where a stranger writes the content.
const escape = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const SEVERITY_LABEL: Record<string, string> = {
  BLOCKING: 'Bloquant',
  ANNOYING: 'Gênant',
  COSMETIC: 'Cosmétique',
};

export const bugReportEmail = (
  to: string,
  severity: string,
  message: string,
  context: ReportContext,
  reportedBy: string,
  filedToday: number,
): MailMessage => {
  const label = SEVERITY_LABEL[severity] ?? severity;
  const lines = [
    ['Gravité', label],
    ['Page', context.page],
    ['Signalé par', reportedBy],
    // The count is here for one reason: once the hourly cap silences the next
    // messages, this line is what still says a flood is under way — and it is
    // the number that tells you whether to reach for the block button.
    ['Signalements de ce compte en 24 h', String(filedToday)],
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
    subject: `[menu] ${label} — ${message.slice(0, 60)}`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;">
  <p style="margin:0 0 16px;white-space:pre-wrap;font-size:16px;line-height:1.6;">${escape(message)}</p>
  <table style="border-collapse:collapse;font-size:13px;">${rows}</table>
</body></html>`,
    text: `${message}\n\n${lines.map(([name, value]): string => `${name} : ${value}`).join('\n')}\n`,
  };
};
