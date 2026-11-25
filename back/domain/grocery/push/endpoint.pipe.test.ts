import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { pushEndpointPipe } from './endpoint.pipe';
import { pushConstraints } from './utils';

const transform = (value: unknown): string => pushEndpointPipe.transform(value, { type: 'custom' });

describe('the push endpoint pipe', () => {
  it('passes an https address unchanged', () => {
    expect(transform('https://push.example/send/abc')).toBe('https://push.example/send/abc');
  });

  it.each([
    ['http://push.example/1'],
    ['javascript:alert(1)'],
    ['not a url'],
    [''],
    [12],
    [undefined],
    [`https://push.example/${'a'.repeat(pushConstraints().endpointMaxLength)}`],
  ])('refuses %j', (value) => {
    expect(() => transform(value)).toThrow(BadRequestException);
  });
});
