import { describe, expect, it } from 'vitest';
import { PAGE_PAYLOAD_BUDGET_GZIP_BYTES, pagePayloadProblemsOf } from './pagePayload';

describe('the payload of a prerendered page', () => {
  it('passes within its ceiling', () => {
    expect(pagePayloadProblemsOf('recettes', PAGE_PAYLOAD_BUDGET_GZIP_BYTES)).toEqual([]);
  });

  it('fails over its ceiling, naming the page', () => {
    const problems = pagePayloadProblemsOf('recettes', PAGE_PAYLOAD_BUDGET_GZIP_BYTES + 1);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('recettes');
  });
});
