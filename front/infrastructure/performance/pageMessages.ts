// The messages a page downloads: the shell every page has (`messages.json`, the `*.shell.json`
// files of the domains and the infrastructure ones) and the file of each domain it names in
// `definePageMeta({ translations })`. They were one 19 KB gzipped file that every page fetched
// before its first paint, including the texts of the pages it never showed. Measured: 4.1 KB
// for the shell, 0.3 to 4.5 KB for a domain.
export const SHELL_MESSAGES_BUDGET_GZIP_BYTES = 4_500;
export const DOMAIN_MESSAGES_BUDGET_GZIP_BYTES = 5_000;

export const messagesProblemsOf = (file: string, gzipBytes: number, budget: number): string[] =>
  gzipBytes > budget ? [`${file}: ${gzipBytes} B gzipped, over ${budget} B`] : [];
