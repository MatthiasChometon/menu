<script setup lang="ts">
import type { ImprovementRequestsQuery } from '#gql';
import { ImprovementStatus } from '#gql/default';

type Suggestion = ImprovementRequestsQuery['improvementRequests'][number];

const { t, locale } = useNuxtApp().$i18n;
const { isAdmin } = useAdmin();

useSeoMeta({ title: (): string => t('improvement.admin.title') });
useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

const { data, refresh } = useAsyncData(
  'improvement:requests',
  async (): Promise<Suggestion[]> => {
    if (!isAdmin.value) return [];

    const result = await GqlImprovementRequests().catch((): undefined => undefined);
    return result?.improvementRequests ?? [];
  },
  { server: false, watch: [isAdmin] },
);

const suggestions = computed((): Suggestion[] => data.value ?? []);

const importanceLabel = (importance: string): string =>
  ({
    NICE_TO_HAVE: t('improvement.niceToHave'),
    WOULD_HELP: t('improvement.wouldHelp'),
    IMPORTANT: t('improvement.important'),
  })[importance] ?? importance;

const statusLabel = (status: string): string =>
  ({
    NEW: t('improvement.admin.statusNew'),
    PLANNED: t('improvement.admin.statusPlanned'),
    DONE: t('improvement.admin.statusDone'),
    DECLINED: t('improvement.admin.statusDeclined'),
  })[status] ?? status;

const importanceColour = (importance: string): 'primary' | 'warning' | 'neutral' =>
  importance === 'IMPORTANT' ? 'primary' : importance === 'WOULD_HELP' ? 'warning' : 'neutral';

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

const setStatus = async (id: string, status: ImprovementStatus): Promise<void> => {
  await GqlSetImprovementStatus({ input: { id, status } });
  await refresh();
};
</script>

<template>
  <UContainer class="py-6">
    <h1 class="font-serif text-4xl">{{ $t('improvement.admin.title') }}</h1>
    <p class="mt-1 text-muted">{{ $t('improvement.admin.lead') }}</p>

    <ClientOnly>
      <template #fallback>
        <div class="mt-6 space-y-3">
          <USkeleton v-for="row in 3" :key="row" class="h-24 rounded-xl" />
          <span class="sr-only">{{ $t('accessibility.loading') }}</span>
        </div>
      </template>

      <p v-if="!isAdmin" class="mt-8 text-muted">{{ $t('improvement.admin.forbidden') }}</p>
      <p v-else-if="suggestions.length === 0" class="mt-8 text-muted">
        {{ $t('improvement.admin.empty') }}
      </p>

      <ul v-else class="mt-6 space-y-3">
        <li v-for="suggestion in suggestions" :key="suggestion.id">
          <UCard
            :ui="{ body: 'space-y-3' }"
            :class="
              (suggestion.status === 'DONE' || suggestion.status === 'DECLINED') && 'opacity-60'
            "
          >
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="importanceColour(suggestion.importance)" variant="subtle" size="sm">
                {{ importanceLabel(suggestion.importance) }}
              </UBadge>
              <UBadge v-if="suggestion.status !== 'NEW'" color="neutral" variant="subtle" size="sm">
                {{ statusLabel(suggestion.status) }}
              </UBadge>
              <span class="ml-auto text-xs text-muted tabular-nums">
                {{ dateLabel(suggestion.createdAt) }}
              </span>
            </div>

            <p class="whitespace-pre-wrap">{{ suggestion.message }}</p>

            <dl class="grid gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-2">
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('improvement.admin.page') }}</dt>
                <dd class="truncate">{{ suggestion.context.page }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('improvement.admin.screen') }}</dt>
                <dd>{{ suggestion.context.viewport }}</dd>
              </div>
              <div v-if="suggestion.requestedBy !== null" class="flex gap-2 sm:col-span-2">
                <dt class="font-medium">{{ $t('auth.signedInAs') }}</dt>
                <dd class="truncate">{{ suggestion.requestedBy }}</dd>
              </div>
            </dl>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="suggestion.status !== 'PLANNED'"
                icon="i-lucide-calendar-check"
                size="xs"
                variant="soft"
                @click="setStatus(suggestion.id, ImprovementStatus.PLANNED)"
              >
                {{ $t('improvement.admin.markPlanned') }}
              </UButton>
              <UButton
                v-if="suggestion.status !== 'DONE'"
                icon="i-lucide-check"
                size="xs"
                variant="soft"
                @click="setStatus(suggestion.id, ImprovementStatus.DONE)"
              >
                {{ $t('improvement.admin.markDone') }}
              </UButton>
              <UButton
                v-if="suggestion.status !== 'DECLINED'"
                icon="i-lucide-archive"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(suggestion.id, ImprovementStatus.DECLINED)"
              >
                {{ $t('improvement.admin.decline') }}
              </UButton>
              <UButton
                v-if="suggestion.status !== 'NEW'"
                icon="i-lucide-undo-2"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(suggestion.id, ImprovementStatus.NEW)"
              >
                {{ $t('improvement.admin.reopen') }}
              </UButton>
            </div>
          </UCard>
        </li>
      </ul>
    </ClientOnly>
  </UContainer>
</template>
