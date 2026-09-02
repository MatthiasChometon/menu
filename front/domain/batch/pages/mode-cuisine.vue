<script setup lang="ts">
const { selectedMenu: currentMenu, isLoading } = useSelectedWeek();
const { planOf } = useBatchPlan();
const { nameOf, stepsOf } = useFoodFormat();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const { isSupported, isActive, request, release } = useWakeLock();

const plan = computed((): BatchPlan | undefined =>
  currentMenu.value === undefined ? undefined : planOf(currentMenu.value),
);

const heading = ref<HTMLHeadingElement | null>(null);

// The whole point of this screen is to sit on the counter without dimming, so
// it claims the lock the moment it is open rather than waiting for a tap —
// and useWakeLock already re-acquires it on its own once the tab is visible
// again (see its visibilitychange handling), so nothing extra is needed here.
onMounted(async (): Promise<void> => {
  if (isSupported.value) await request('screen');
  heading.value?.focus();
});

onBeforeUnmount((): void => {
  if (isActive.value) void release();
});

useSeoMeta({ title: (): string => t('batch.kitchenMode.title') });
</script>

<template>
  <div class="kitchen-mode fixed inset-0 z-50 overflow-y-auto">
    <div class="mx-auto max-w-2xl px-4 py-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UButton
          :to="localePath('/batch')"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
        >
          {{ $t('batch.kitchenMode.back') }}
        </UButton>

        <ClientOnly>
          <p
            v-if="isSupported && isActive"
            class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <UIcon name="i-lucide-lightbulb" class="size-3.5 shrink-0" aria-hidden="true" />
            {{ $t('batch.kitchenMode.wakeLockOn') }}
          </p>
        </ClientOnly>
      </div>

      <h1
        ref="heading"
        tabindex="-1"
        class="mt-4 font-serif text-3xl tracking-tight focus:outline-none"
      >
        {{ $t('batch.kitchenMode.title') }}
      </h1>

      <div v-if="isLoading" class="mt-6 space-y-4" aria-hidden="true">
        <USkeleton class="h-48 rounded-2xl" />
        <USkeleton class="h-48 rounded-2xl" />
      </div>

      <div
        v-else-if="plan === undefined || plan.tasks.length === 0"
        class="mt-16 flex flex-col items-center gap-3 text-center"
      >
        <UIcon name="i-lucide-chef-hat" class="size-12 text-dimmed" />
        <p class="text-lg font-bold">{{ $t('batch.kitchenMode.empty.title') }}</p>
        <p class="max-w-sm text-muted">{{ $t('batch.kitchenMode.empty.hint') }}</p>
      </div>

      <template v-else>
        <div class="mt-6">
          <BatchTimerBoard />
        </div>

        <div class="mt-8 space-y-6">
          <UCard v-for="task in plan.tasks" :key="task.recipe.id">
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-cooking-pot" class="size-5 shrink-0 text-primary" />
                <h2 class="min-w-0 flex-1 truncate text-lg font-bold">
                  {{ nameOf(task.recipe) }}
                </h2>
                <span class="shrink-0 text-sm tabular-nums text-muted">
                  {{ task.minutes }} {{ $t('batch.minutes') }}
                </span>
              </div>
            </template>

            <RecipeStepList
              :steps="stepsOf(task.recipe)"
              :quantities="task.quantities"
              :show-wake-lock-toggle="false"
              :recipe-name="nameOf(task.recipe)"
            />
          </UCard>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.kitchen-mode {
  background: var(--canvas);
}
</style>
