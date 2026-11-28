import { globSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import {
  DOMAIN_MESSAGES_BUDGET_GZIP_BYTES,
  messagesProblemsOf,
  SHELL_MESSAGES_BUDGET_GZIP_BYTES,
} from '../pageMessages';

// Run after `nuxt generate`: exits non-zero when the shell messages, or the file of a domain, is
// over its ceiling.
const gzipBytesOf = (path: string): number => gzipSync(readFileSync(path), { level: 9 }).length;

const shell = globSync('.output/public/_i18n/*/*/messages.json');
const domains = globSync('domain/*/translation/{fr,en}.json');
const problems = [
  ...shell.flatMap((path) =>
    messagesProblemsOf(path, gzipBytesOf(path), SHELL_MESSAGES_BUDGET_GZIP_BYTES),
  ),
  ...domains.flatMap((path) =>
    messagesProblemsOf(path, gzipBytesOf(path), DOMAIN_MESSAGES_BUDGET_GZIP_BYTES),
  ),
];
if (shell.length === 0) problems.push('No shell messages under .output/public/_i18n.');
if (problems.length > 0) {
  process.stderr.write(`Page messages are too heavy:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`${shell.length + domains.length} message files within budget.\n`);
