import { describe, expect, it } from 'vitest';
import { DEFAULT_PORT, validateEnvironment } from './env';

const valid = { DATABASE_URL: 'postgres://menu@localhost/menu', JWT_SECRET: 'a-secret' };

describe('the environment check made at boot', () => {
  it('accepts the two required variables and defaults the port', () => {
    const environment = validateEnvironment(valid);

    expect(environment.PORT).toBe(DEFAULT_PORT);
  });

  it('turns a configured port into a number', () => {
    const environment = validateEnvironment({ ...valid, PORT: '4000' });

    expect(environment.PORT).toBe(4000);
  });

  it('keeps every other variable untouched', () => {
    const environment = validateEnvironment({ ...valid, FRONT_URL: 'http://localhost:3777' });

    expect(environment.FRONT_URL).toBe('http://localhost:3777');
  });

  it.each(['DATABASE_URL', 'JWT_SECRET'])('refuses to boot without %s', (name) => {
    expect(() => validateEnvironment({ ...valid, [name]: '  ' })).toThrow(`${name} is required`);
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['MAIL_PORT', '4.5'],
    ['BUG_NOTICES_PER_HOUR', 'many'],
  ])('refuses %s set to %s', (name, value) => {
    expect(() => validateEnvironment({ ...valid, [name]: value })).toThrow(`${name} must be`);
  });

  it('lists every problem at once, never a value', () => {
    const attempt = (): unknown =>
      validateEnvironment({ DATABASE_URL: '', JWT_SECRET: '', PORT: 'hunter2' });

    expect(attempt).toThrow(/DATABASE_URL is required; JWT_SECRET is required; PORT must be/);
    expect(attempt).not.toThrow(/hunter2/);
  });
});
