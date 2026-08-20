<script setup lang="ts">
const route = useRoute();
const localePath = useLocalePath();
const { t } = useNuxtApp().$i18n;
const { verify } = useEmailVerification();

const outcome = ref<'pending' | 'signed-in' | 'expired' | 'missing'>('pending');
const hasSucceeded = computed((): boolean => outcome.value === 'signed-in');

// The link is followed once, on arrival: there is nothing to decide here, and a
// button to press would only stand between the reader and their account.
onMounted(async (): Promise<void> => {
  const token = route.query.token;
  outcome.value = await verify(typeof token === 'string' ? token : undefined);
});

// One heading, always, whatever the page is doing. Rendering it only once the
// answer arrives leaves the page with no title while it waits, which is exactly
// when somebody using a screen reader is trying to work out where they landed.
const heading = computed((): string => {
  if (outcome.value === 'pending') return t('auth.verification.pendingTitle');

  return hasSucceeded.value ? t('auth.verification.doneTitle') : t('auth.verification.failedTitle');
});

useHead({ title: (): string => t('auth.verification.pageTitle') });
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
    <UIcon
      v-if="outcome === 'pending'"
      name="i-lucide-loader-circle"
      class="size-12 animate-spin text-dimmed"
    />
    <UIcon
      v-else
      :name="hasSucceeded ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
      :class="['size-12', hasSucceeded ? 'text-primary' : 'text-dimmed']"
    />

    <h1 class="text-xl font-bold">{{ heading }}</h1>

    <p v-if="outcome === 'pending'" class="text-muted">
      {{ $t('auth.verification.pending') }}
    </p>
    <p v-else-if="hasSucceeded" class="text-muted">{{ $t('auth.verification.doneBody') }}</p>
    <!-- Unknown, spent and expired all land here, because the API refuses to
         tell them apart — saying which would help only someone guessing. -->
    <p v-else class="text-muted">{{ $t('auth.verification.failedBody') }}</p>

    <UButton
      v-if="outcome !== 'pending'"
      :to="localePath('/profil')"
      :variant="hasSucceeded ? 'solid' : 'subtle'"
      size="lg"
      class="mt-2 font-semibold"
    >
      {{ hasSucceeded ? $t('auth.verification.toProfile') : $t('auth.verification.retry') }}
    </UButton>
  </section>
</template>
