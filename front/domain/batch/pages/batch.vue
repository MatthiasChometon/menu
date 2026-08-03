<script setup lang="ts">
const { currentMenu } = useMenu();
const { planOf } = useBatchPlan();
const { nameOf } = useFoodFormat();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();

const plan = computed((): BatchPlan | undefined =>
  currentMenu === undefined ? undefined : planOf(currentMenu),
);

const tips = computed((): string[] => [
  t('batch.tips.start'),
  t('batch.tips.store'),
  t('batch.tips.freeze'),
]);

useSeoMeta({ title: (): string => t('batch.title') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <UButton
      :to="localePath('/')"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="mb-4"
    >
      {{ $t('menu.nav.week') }}
    </UButton>

    <div
      v-if="plan === undefined || plan.tasks.length === 0"
      class="flex flex-col items-center gap-3 py-20 text-center"
    >
      <UIcon name="i-lucide-chef-hat" class="size-12 text-dimmed" />
      <h1 class="text-xl font-bold">{{ $t('batch.empty.title') }}</h1>
      <p class="max-w-sm text-muted">{{ $t('batch.empty.hint') }}</p>
    </div>

    <template v-else>
      <header class="rise">
        <h1 class="text-3xl font-black tracking-tight">{{ $t('batch.title') }}</h1>
        <p class="mt-1 text-muted">{{ $t('batch.lead') }}</p>
        <p class="mt-3 inline-flex items-center gap-2 rounded-full bg-elevated px-3 py-1.5 text-sm">
          <UIcon name="i-lucide-timer" class="size-4 text-primary" />
          <span class="text-muted">{{ $t('batch.totalTime') }}</span>
          <span class="font-bold tabular-nums">
            {{ plan.totalMinutes }} {{ $t('batch.minutes') }}
          </span>
        </p>
      </header>

      <section class="mt-8">
        <h2 class="text-xl font-bold">{{ $t('batch.toCook') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('batch.toCookHint') }}</p>
        <p class="mt-1 text-sm text-dimmed">{{ $t('batch.raw') }}</p>

        <div class="mt-4 space-y-4">
          <BatchTask
            v-for="(task, index) in plan.tasks"
            :key="task.recipe.id"
            :task="task"
            :index="index"
          />
        </div>
      </section>

      <section v-if="plan.freshTasks.length > 0" class="mt-10">
        <h2 class="text-xl font-bold">{{ $t('batch.fresh') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('batch.freshHint') }}</p>

        <ul class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="task in plan.freshTasks"
            :key="task.recipe.id"
            class="flex items-center gap-3 rounded-2xl border border-default p-3"
          >
            <UIcon name="i-lucide-flame" class="size-4 shrink-0 text-primary" />
            <NuxtLink
              :to="localePath(`/recette/${task.recipe.id}`)"
              class="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
            >
              {{ nameOf(task.recipe) }}
            </NuxtLink>
            <span class="shrink-0 text-xs tabular-nums text-muted">
              {{ task.minutes }} {{ $t('batch.minutes') }}
            </span>
          </li>
        </ul>
      </section>

      <section class="rise mt-10 rounded-2xl border border-default bg-elevated/40 p-5">
        <h2 class="mb-3 flex items-center gap-2 font-bold">
          <UIcon name="i-lucide-lightbulb" class="size-5 text-primary" />
          {{ $t('batch.tips.title') }}
        </h2>
        <ul class="space-y-2">
          <li v-for="tip in tips" :key="tip" class="flex items-start gap-2.5">
            <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
            <span class="text-sm text-muted">{{ tip }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
