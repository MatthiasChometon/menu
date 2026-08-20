<script setup lang="ts">
import type { BugReportsQuery } from '#gql';
import { BugStatus } from '#gql/default';

type Report = BugReportsQuery['bugReports'][number];

const { t, locale } = useNuxtApp().$i18n;
const { isAdmin } = useAdmin();

useSeoMeta({ title: (): string => t('bugReport.admin.title') });
// Nothing here belongs in a search result, and the page needs a session to say
// anything at all.
useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

const { data, refresh } = useAsyncData(
  'bug:reports',
  async (): Promise<Report[]> => {
    if (!isAdmin.value) return [];

    const result = await GqlBugReports().catch((): undefined => undefined);
    return result?.bugReports ?? [];
  },
  { server: false, watch: [isAdmin] },
);

const reports = computed((): Report[] => data.value ?? []);

const severityLabel = (severity: string): string =>
  ({
    BLOCKING: t('bugReport.blocking'),
    ANNOYING: t('bugReport.annoying'),
    COSMETIC: t('bugReport.cosmetic'),
  })[severity] ?? severity;

const statusLabel = (status: string): string =>
  ({
    NEW: t('bugReport.admin.statusNew'),
    FIXED: t('bugReport.admin.statusFixed'),
    DISMISSED: t('bugReport.admin.statusDismissed'),
  })[status] ?? status;

// Blocking first among the new ones, because a list sorted only by arrival
// makes you read everything to find what actually stops somebody working.
const severityColour = (severity: string): 'error' | 'warning' | 'neutral' =>
  severity === 'BLOCKING' ? 'error' : severity === 'ANNOYING' ? 'warning' : 'neutral';

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

const setStatus = async (id: string, status: BugStatus): Promise<void> => {
  await GqlSetBugStatus({ input: { id, status } });
  await refresh();
};

// Acted on from the report you are reading, because that is where a flood shows
// itself. Reversible on the spot: a judgement nobody dares undo is a judgement
// nobody dares make.
const setBlocked = async (reportId: string, blocked: boolean): Promise<void> => {
  await GqlBlockAccount({ input: { reportId, blocked } });
  await refresh();
};
</script>

<template>
  <UContainer class="py-6">
    <h1 class="text-3xl font-black">{{ $t('bugReport.admin.title') }}</h1>
    <p class="mt-1 text-muted">{{ $t('bugReport.admin.lead') }}</p>

    <ClientOnly>
      <p v-if="!isAdmin" class="mt-8 text-muted">{{ $t('bugReport.admin.forbidden') }}</p>
      <p v-else-if="reports.length === 0" class="mt-8 text-muted">
        {{ $t('bugReport.admin.empty') }}
      </p>

      <ul v-else class="mt-6 space-y-3">
        <li v-for="report in reports" :key="report.id">
          <UCard :ui="{ body: 'space-y-3' }" :class="report.status !== 'NEW' && 'opacity-60'">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="severityColour(report.severity)" variant="subtle" size="sm">
                {{ severityLabel(report.severity) }}
              </UBadge>
              <UBadge v-if="report.status !== 'NEW'" color="neutral" variant="subtle" size="sm">
                {{ statusLabel(report.status) }}
              </UBadge>
              <UBadge v-if="report.reporterBlocked" color="error" variant="subtle" size="sm">
                {{ $t('bugReport.admin.blocked') }}
              </UBadge>
              <span class="ml-auto text-xs text-muted tabular-nums">
                {{ dateLabel(report.createdAt) }}
              </span>
            </div>

            <p class="whitespace-pre-wrap">{{ report.message }}</p>

            <dl class="grid gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-2">
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('bugReport.admin.page') }}</dt>
                <dd class="truncate">{{ report.context.page }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('bugReport.admin.screen') }}</dt>
                <dd>{{ report.context.viewport }}</dd>
              </div>
              <div v-if="report.reportedBy !== null" class="flex gap-2">
                <dt class="font-medium">{{ $t('auth.signedInAs') }}</dt>
                <dd class="truncate">{{ report.reportedBy }}</dd>
              </div>
              <div class="flex gap-2 sm:col-span-2">
                <dt class="font-medium">{{ $t('bugReport.admin.browser') }}</dt>
                <dd class="truncate">{{ report.context.userAgent }}</dd>
              </div>
            </dl>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="report.status === 'NEW'"
                icon="i-lucide-check"
                size="xs"
                variant="soft"
                @click="setStatus(report.id, BugStatus.FIXED)"
              >
                {{ $t('bugReport.admin.markFixed') }}
              </UButton>
              <UButton
                v-if="report.status === 'NEW'"
                icon="i-lucide-archive"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(report.id, BugStatus.DISMISSED)"
              >
                {{ $t('bugReport.admin.dismiss') }}
              </UButton>
              <UButton
                v-else
                icon="i-lucide-undo-2"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(report.id, BugStatus.NEW)"
              >
                {{ $t('bugReport.admin.reopen') }}
              </UButton>

              <UButton
                v-if="report.reportedBy !== null"
                :icon="report.reporterBlocked ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                size="xs"
                variant="ghost"
                :color="report.reporterBlocked ? 'neutral' : 'error'"
                class="ml-auto"
                :title="report.reporterBlocked ? undefined : $t('bugReport.admin.blockedNote')"
                @click="setBlocked(report.id, !report.reporterBlocked)"
              >
                {{
                  report.reporterBlocked
                    ? $t('bugReport.admin.unblock')
                    : $t('bugReport.admin.block')
                }}
              </UButton>
            </div>
          </UCard>
        </li>
      </ul>
    </ClientOnly>
  </UContainer>
</template>
