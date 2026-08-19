import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import EmailForm from './EmailForm.vue';

const fillIn = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>): Promise<void> => {
  await wrapper.find('input[type="email"]').setValue('someone@example.com');
  await wrapper.find('input[type="password"]').setValue('a-long-enough-password');
};

// Found by what it says rather than by position: the form grew a second link
// button, and a test that clicks "the first one" quietly starts testing
// something else the day the order changes.
const clickLabelled = async (
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  label: string,
): Promise<void> => {
  const button = wrapper
    .findAll('button')
    .find((candidate: { text: () => string }): boolean => candidate.text().includes(label));
  if (button === undefined) throw new Error(`No button reads "${label}".`);

  await button.trigger('click');
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

registerEndpoint('/auth/forgot-password', { method: 'POST', handler: () => null });

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
    await clickLabelled(wrapper, 'En créer un');

    await fillIn(wrapper);
    await wrapper.find('form').trigger('submit');
    await settle();
    await wrapper.vm.$nextTick();

    // The account exists but opens nothing yet: the form is gone, replaced by
    // the only thing left to do.
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Regarde tes mails');
  });

  it('asks only for an address when the password is the thing forgotten', async () => {
    const wrapper = await mountSuspended(EmailForm);

    await clickLabelled(wrapper, 'Mot de passe oublié');

    // Nothing to prove at this point, and a password box would suggest
    // otherwise to somebody who has just told us they cannot remember it.
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
  });

  it('promises a link without saying whether the address is known', async () => {
    const wrapper = await mountSuspended(EmailForm);
    await clickLabelled(wrapper, 'Mot de passe oublié');

    await wrapper.find('input[type="email"]').setValue('nobody@example.com');
    await wrapper.find('form').trigger('submit');
    await settle();
    await wrapper.vm.$nextTick();

    // The API answers the same for an address it knows and one it does not, and
    // so must the screen — otherwise this becomes the way to find out who has
    // an account here.
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
