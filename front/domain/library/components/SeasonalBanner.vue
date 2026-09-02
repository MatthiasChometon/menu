<script setup lang="ts">
const { foodIds } = defineProps<{ foodIds: string[] }>();
const emit = defineEmits<{ 'show-season': [] }>();

const { t, locale } = useNuxtApp().$i18n;
const { foodOf } = useFoods();
const { nameOf } = useFoodFormat();

const monthLabel = computed((): string =>
  new Date().toLocaleDateString(locale.value, { month: 'long' }),
);

const foods = computed((): Food[] =>
  foodIds
    .map((id): Food | undefined => foodOf(id))
    .filter((food): food is Food => food !== undefined),
);
</script>

<template>
  <section
    v-if="foods.length > 0"
    class="rise rounded-2xl border border-primary/30 bg-primary/5 p-5"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 font-bold">
          <UIcon name="i-lucide-leaf" class="size-5 text-primary" />
          {{ t('library.season.title') }} {{ monthLabel }}
        </h2>
        <p class="mt-1 text-sm text-muted">{{ t('library.season.hint') }}</p>
      </div>
      <UButton
        variant="soft"
        color="primary"
        size="sm"
        icon="i-lucide-filter"
        @click="emit('show-season')"
      >
        {{ t('library.season.cta') }}
      </UButton>
    </div>

    <ul class="mt-3 flex flex-wrap gap-2">
      <li v-for="food in foods" :key="food.id">
        <UBadge color="primary" variant="subtle" :icon="food.icon">
          {{ nameOf(food) }}
        </UBadge>
      </li>
    </ul>
  </section>
</template>
