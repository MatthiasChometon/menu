import { describe, expect, it } from 'vitest';
import { messagesProblemsOf, SHELL_MESSAGES_BUDGET_GZIP_BYTES } from './pageMessages';

describe('the messages of a page', () => {
  it('pass within their ceiling', () => {
    expect(
      messagesProblemsOf(
        'fr/messages.json',
        SHELL_MESSAGES_BUDGET_GZIP_BYTES,
        SHELL_MESSAGES_BUDGET_GZIP_BYTES,
      ),
    ).toEqual([]);
  });

  it('fail over their ceiling, naming the file', () => {
    const problems = messagesProblemsOf('fr/messages.json', 5_001, 5_000);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('fr/messages.json');
  });
});
