import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { route } = vi.hoisted(() => ({ route: { query: {} as Record<string, unknown> } }));

mockNuxtImport('useRoute', () => (): typeof route => route);

describe('useGoogleSignIn', () => {
  beforeEach((): void => {
    useRuntimeConfig().public.apiBase = 'https://api.example.test';
  });

  it('offers nothing when no API is configured', () => {
    useRuntimeConfig().public.apiBase = '';

    expect(useGoogleSignIn().googleSignInUrl.value).toBeUndefined();
  });

  it('starts a plain sign-in when the reader was not sent from a page', () => {
    route.query = {};

    expect(useGoogleSignIn().googleSignInUrl.value).toBe('https://api.example.test/auth/google');
  });

  it('hands the page the reader came from to the API', () => {
    route.query = { redirect: '/profil?tab=weight' };

    expect(useGoogleSignIn().googleSignInUrl.value).toBe(
      'https://api.example.test/auth/google?redirect=%2Fprofil%3Ftab%3Dweight',
    );
  });

  it.each(['https://evil.example', '//evil.example', ['/a', '/b']])(
    'never hands over %j',
    (redirect) => {
      route.query = { redirect };

      expect(useGoogleSignIn().googleSignInUrl.value).toBe('https://api.example.test/auth/google');
    },
  );
});
