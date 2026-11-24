import { describe, expect, it } from 'vitest';
import { DEFAULT_PORT, listenPort, validateEnvironment } from './env';

const valid = { DATABASE_URL: 'postgres://menu@localhost/menu', JWT_SECRET: 'a-secret' };

describe('the environment check made at boot', () => {
  it('accepts the two required variables alone', () => {
    expect(() => validateEnvironment(valid)).not.toThrow();
  });

  it.each(['DATABASE_URL', 'JWT_SECRET'])('refuses to boot without %s', (name) => {
    expect(() => validateEnvironment({ ...valid, [name]: '  ' })).toThrow(`${name} is required`);
  });

  it.each([
    ['MAIL_PORT', '4.5'],
    ['BUG_NOTICES_PER_HOUR', 'many'],
  ])('refuses %s set to %s', (name, value) => {
    expect(() => validateEnvironment({ ...valid, [name]: value })).toThrow(`${name} must be`);
  });

  it('does not look at PORT, which the host owns under Passenger', () => {
    expect(() => validateEnvironment({ ...valid, PORT: 'passenger' })).not.toThrow();
  });

  it('lists every problem at once, never a value', () => {
    const attempt = (): unknown =>
      validateEnvironment({ DATABASE_URL: '', JWT_SECRET: '', MAIL_PORT: 'hunter2' });

    expect(attempt).toThrow(/DATABASE_URL is required; JWT_SECRET is required; MAIL_PORT must be/);
    expect(attempt).not.toThrow(/hunter2/);
  });
});

describe('the port the server listens on', () => {
  it('defaults when unset', () => {
    expect(listenPort({})).toBe(DEFAULT_PORT);
  });

  it('turns a configured port into a number', () => {
    expect(listenPort({ PORT: '4000' })).toBe(4000);
  });

  it.each(['abc', '70000'])('refuses %s', (value) => {
    expect(() => listenPort({ PORT: value })).toThrow('PORT must be a TCP port');
  });
});
