<script setup lang="ts">
const { selectedWeek, selectedMenu: currentMenu, isLoading } = useSelectedWeek();
const { planOf } = useBatchPlan();
const { nameOf } = useFoodFormat();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();

const { statusOf, setStatus, progressOf, reset } = useCookingLog(selectedWeek);
const { groupsOf } = useBatchContainers();
const { itemsOf } = useEquipmentList();

const plan = computed((): BatchPlan | undefined =>
  currentMenu.value === undefined ? undefined : planOf(currentMenu.value),
);

const containerGroups = computed((): ContainerGroup[] =>
  currentMenu.value === undefined || plan.value === undefined
    ? []
    : groupsOf(currentMenu.value, plan.value.tasks),
);

const totalContainers = computed((): number =>
  containerGroups.value.reduce((total, group): number => total + group.labels.length, 0),
);

const equipmentItems = computed((): EquipmentItem[] =>
  itemsOf(plan.value?.tasks.length ?? 0, totalContainers.value),
);

const progressById = computed(
  (): Map<string, DishProgress> =>
    new Map(
      (currentMenu.value === undefined ? [] : progressOf(currentMenu.value)).map(
        (progress): [string, DishProgress] => [progress.recipe.id, progress],
      ),
    ),
);

const tasksWith = (status: DishStatus): BatchTask[] =>
  (plan.value?.tasks ?? []).filter((task): boolean => statusOf(task.recipe.id) === status);

const toCook = computed((): BatchTask[] => tasksWith('todo'));

const progressFor = (task: BatchTask): DishProgress | undefined =>
  progressById.value.get(task.recipe.id);

const cooked = computed((): DishProgress[] =>
  tasksWith('done')
    .map(progressFor)
    .filter((progress): progress is DishProgress => progress !== undefined),
);

const setAside = computed((): DishProgress[] =>
  tasksWith('skipped')
    .map(progressFor)
    .filter((progress): progress is DishProgress => progress !== undefined),
);

// Only what is still to cook: a session that is half done should show the time
// left, not the time it would have taken from scratch.
const minutesLeft = computed((): number =>
  toCook.value.reduce((total, task): number => total + task.minutes, 0),
);

const hasProgress = computed((): boolean => cooked.value.length > 0 || setAside.value.length > 0);

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

    <!-- Hold the space with a skeleton while a signed-in week loads, rather than
         flash "nothing to prepare" before the plan arrives. -->
    <div v-if="isLoading" class="space-y-4 py-8" aria-hidden="true">
      <USkeleton class="h-24 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl" />
    </div>
    <span v-if="isLoading" class="sr-only">{{ $t('accessibility.loading') }}</span>

    <div
      v-else-if="plan === undefined || plan.tasks.length === 0"
      class="flex flex-col items-center gap-3 py-20 text-center"
    >
      <UIcon name="i-lucide-chef-hat" class="size-12 text-dimmed" />
      <h1 class="text-xl font-bold">{{ $t('batch.empty.title') }}</h1>
      <p class="max-w-sm text-muted">{{ $t('batch.empty.hint') }}</p>
    </div>

    <template v-else>
      <header class="rise">
        <h1 class="font-serif text-4xl tracking-tight">{{ $t('batch.title') }}</h1>
        <p class="mt-1 text-muted">{{ $t('batch.lead') }}</p>
        <MenuWeekPicker class="mt-3" />
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <p class="inline-flex items-center gap-2 rounded-full bg-elevated px-3 py-1.5 text-sm">
            <UIcon name="i-lucide-timer" class="size-4 text-primary" />
            <span class="text-muted">{{ $t('cooking.timeLeft') }}</span>
            <span class="font-bold tabular-nums">
              {{ minutesLeft }} {{ $t('batch.minutes') }}
            </span>
          </p>
          <UButton
            v-if="hasProgress"
            icon="i-lucide-rotate-ccw"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="reset"
          >
            {{ $t('cooking.resetWeek') }}
          </UButton>
          <UButton
            :to="localePath('/mode-cuisine')"
            icon="i-lucide-fullscreen"
            variant="subtle"
            color="primary"
            size="sm"
          >
            {{ $t('batch.kitchenMode.open') }}
          </UButton>
        </div>
      </header>

      <div class="mt-8">
        <BatchEquipment :items="equipmentItems" />
      </div>

      <div class="mt-10">
        <BatchTimeline :plan="plan" />
      </div>

      <div class="mt-10">
        <BatchTimerBoard />
      </div>

      <section v-if="toCook.length > 0" class="mt-10">
        <h2 class="text-xl font-bold">{{ $t('batch.toCook') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('cooking.toCookHint') }}</p>
        <p class="mt-1 text-sm text-dimmed">{{ $t('batch.raw') }}</p>

        <div class="mt-4 space-y-4">
          <BatchTask
            v-for="(task, index) in toCook"
            :key="task.recipe.id"
            :task="task"
            :index="index"
            @done="setStatus(task.recipe.id, 'done')"
            @skip="setStatus(task.recipe.id, 'skipped')"
          />
        </div>
      </section>

      <section
        v-else
        class="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-default bg-elevated/40 py-10 text-center"
      >
        <UIcon name="i-lucide-party-popper" class="size-9 text-primary" />
        <p class="font-bold">{{ $t('cooking.sessionDone') }}</p>
        <p class="max-w-sm text-sm text-muted">{{ $t('cooking.sessionDoneHint') }}</p>
      </section>

      <section v-if="cooked.length > 0" class="mt-10">
        <h2 class="text-xl font-bold">{{ $t('cooking.fridge') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('cooking.fridgeHint') }}</p>

        <div class="mt-4 space-y-2">
          <CookingDishRow
            v-for="progress in cooked"
            :key="progress.recipe.id"
            :progress="progress"
            @undo="setStatus(progress.recipe.id, 'todo')"
          />
        </div>
      </section>

      <section v-if="setAside.length > 0" class="mt-10">
        <h2 class="text-xl font-bold">{{ $t('cooking.setAside') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('cooking.setAsideHint') }}</p>

        <div class="mt-4 space-y-2">
          <CookingDishRow
            v-for="progress in setAside"
            :key="progress.recipe.id"
            :progress="progress"
            @undo="setStatus(progress.recipe.id, 'todo')"
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

      <div class="mt-10">
        <BatchContainers :groups="containerGroups" />
      </div>

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
