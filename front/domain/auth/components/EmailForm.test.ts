import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import EmailForm from './EmailForm.vue';

const fillIn = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>): Promise<void> => {
  await wrapper.find('input[type="email"]').setValue('someone@example.com');
  await wrapper.find('input[type="password"]').setValue('a-long-enough-password');
};

const settle = async (): Promise<void> => {
  await new Promise((resolve): void => {
    setTimeout(resolve, 0);
  });
};

registerEndpoint('/auth/register', {
  method: 'POST',
  handler: () => ({ status: 'verification_sent' }),
});

registerEndpoint('/auth/login', {
  method: 'POST',
  handler: () => {
    // What the API answers for an account whose address is still unconfirmed.
    throw createError({ statusCode: 403, statusMessage: 'Confirm your email address.' });
  },
});

registerEndpoint('/auth/resend-verification', { method: 'POST', handler: () => null });

describe('AuthEmailForm', () => {
  it('asks for an address and a password, and nothing else', async () => {
    const wrapper = await mountSuspended(EmailForm);

    // Real inputs of the right type, so a password manager fills them in and a
    // phone keyboard offers the @ sign.
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
  });

  it('sends the reader to their inbox rather than pretending they are in', async () => {
    const wrapper = await mountSuspended(EmailForm);
    await wrapper.find('button[type="button"], a').trigger('click');

    await fillIn(wrapper);
    await wrapper.find('form').trigger('submit');
    await settle();
    await wrapper.vm.$nextTick();

    // The account exists but opens nothing yet: the form is gone, replaced by
    // the only thing left to do.
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Regarde tes mails');
  });

  it('offers a new link when the address was never confirmed', async () => {
    const wrapper = await mountSuspended(EmailForm);

    await fillIn(wrapper);
    await wrapper.find('form').trigger('submit');
    await settle();
    await wrapper.vm.$nextTick();

    // Not "wrong password": the reader typed the right one, and the only thing
    // that will help them is another link.
    expect(wrapper.text()).not.toContain('incorrect');
    expect(wrapper.text()).toContain('Renvoyer le lien');
  });
});
