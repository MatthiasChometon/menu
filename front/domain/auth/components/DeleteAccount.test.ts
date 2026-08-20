import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import DeleteAccount from './DeleteAccount.vue';

// The signed-in account is what decides whether a password is asked for, so the
// test sets it rather than the network: what is under test is the choice, not
// how the account was fetched.
const { account } = vi.hoisted(() => ({
  account: { value: undefined as { id: string; hasPassword: boolean } | undefined },
}));

type Session = { user: typeof account; refresh: () => void };

mockNuxtImport('useAuth', () => (): Session => ({ user: account, refresh: vi.fn() }));

// The modal teleports its body out of the component, so the form is looked for
// where the browser actually puts it.
// Scoped to the dialog this test opened: a teleported one outlives the test
// that opened it, so the document still holds every dialog that came before.
// Reading the document at large answers questions about a previous account.
const currentDialog = (): Element => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  if (dialog === undefined) throw new Error('No dialog is open.');

  return dialog;
};

const passwordBox = (): Element | null => currentDialog().querySelector('input[type="password"]');

const buttonSaying = (words: string): HTMLButtonElement | undefined =>
  [...currentDialog().querySelectorAll('button')].find((candidate): boolean =>
    (candidate.textContent ?? '').includes(words),
  );

// The opener lives in the component; only the dialog it opens is teleported.
// Looking for both in the same place finds neither.
const openDialogFor = async (hasPassword: boolean): Promise<void> => {
  account.value = { id: 'someone', hasPassword };
  const wrapper = await mountSuspended(DeleteAccount);

  const opener = wrapper
    .findAll('button')
    .find((candidate: { text: () => string }): boolean =>
      candidate.text().includes('Supprimer mon compte'),
    );
  if (opener === undefined) throw new Error('The danger zone offers no way in.');

  await opener.trigger('click');
  await nextTick();
};

describe('deleting an account from the profile', () => {
  it('asks for the password when the account has one', async () => {
    await openDialogFor(true);

    expect(passwordBox()).not.toBeNull();
  });

  it('asks for nothing when the account was opened through Google', async () => {
    await openDialogFor(false);

    // A box nobody can fill is worse than no box: a Google account has no
    // password, and showing the field would leave the reader stuck at a step
    // they cannot pass.
    expect(passwordBox()).toBeNull();
    expect(buttonSaying('Supprimer définitivement')?.disabled).toBe(false);
  });

  it('will not confirm on an empty password when one is required', async () => {
    await openDialogFor(true);

    // The refusal happens before the request. Sending it would spend one of the
    // ten attempts the rate limiter allows, on a call that cannot succeed.
    expect(buttonSaying('Supprimer définitivement')?.disabled).toBe(true);
  });
});
