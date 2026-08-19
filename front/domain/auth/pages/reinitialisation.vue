<script setup lang="ts">
const route = useRoute();
const localePath = useLocalePath();
const { t } = useNuxtApp().$i18n;
const { password, isBusy, submit } = usePasswordReset();

const outcome = ref<'asking' | 'signed-in' | 'expired' | 'missing' | 'refused'>('asking');

// Read once, on arrival: the token belongs to the link, not to the form, and
// putting it in a field would only invite somebody to change it.
const token = computed((): string | undefined =>
  typeof route.query.token === 'string' ? route.query.token : undefined,
);

const choose = async (): Promise<void> => {
  outcome.value = await submit(token.value);
};

// One heading in every state, including while the form is still being filled
// in: a page that only names itself once it is finished is a page nobody using
// a screen reader can place.
const heading = computed((): string => {
  if (outcome.value === 'signed-in') return t('auth.reset.doneTitle');
  if (outcome.value === 'expired' || outcome.value === 'missing')
    return t('auth.reset.expiredTitle');

  return t('auth.reset.title');
});

useHead({ title: (): string => t('auth.reset.pageTitle') });
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col items-center gap-4 px-6 py-16 text-center">
    <h1 class="text-xl font-bold">{{ heading }}</h1>

    <template v-if="outcome === 'signed-in'">
      <UIcon name="i-lucide-circle-check" class="size-12 text-primary" />
      <p class="text-muted">{{ $t('auth.reset.doneBody') }}</p>
      <UButton :to="localePath('/profil')" size="lg" class="mt-2 font-semibold">
        {{ $t('auth.reset.toProfile') }}
      </UButton>
    </template>

    <template v-else-if="outcome === 'expired' || outcome === 'missing'">
      <UIcon name="i-lucide-circle-alert" class="size-12 text-dimmed" />
      <p class="text-muted">{{ $t('auth.reset.expiredBody') }}</p>
      <UButton :to="localePath('/profil')" variant="subtle" size="lg" class="mt-2">
        {{ $t('auth.reset.retry') }}
      </UButton>
    </template>

    <form v-else class="flex w-full flex-col gap-3" @submit.prevent="choose">
      <p class="text-muted">{{ $t('auth.reset.body') }}</p>
      <UInput
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
        size="lg"
        :placeholder="$t('auth.reset.newPasswordPlaceholder')"
        :aria-label="$t('auth.reset.newPasswordLabel')"
      />
      <p v-if="outcome === 'refused'" role="alert" class="text-sm text-error">
        {{ $t('auth.reset.tooShort') }}
      </p>
      <UButton type="submit" size="lg" block :loading="isBusy" class="font-semibold">
        {{ $t('auth.reset.submit') }}
      </UButton>
    </form>
  </section>
</template>
