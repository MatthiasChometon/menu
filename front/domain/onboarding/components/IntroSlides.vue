<script setup lang="ts">
const emit = defineEmits<{ finished: [] }>();
const { t } = useNuxtApp().$i18n;

type Slide = { icon: string; title: string; lead: string };

const slides = computed((): Slide[] => [
  {
    icon: 'i-lucide-scale',
    title: t('onboarding.intro.weighed.title'),
    lead: t('onboarding.intro.weighed.lead'),
  },
  {
    icon: 'i-lucide-sparkles',
    title: t('onboarding.intro.generated.title'),
    lead: t('onboarding.intro.generated.lead'),
  },
  {
    icon: 'i-lucide-shopping-basket',
    title: t('onboarding.intro.ready.title'),
    lead: t('onboarding.intro.ready.lead'),
  },
]);

const index = ref(0);
const isLast = computed((): boolean => index.value === slides.value.length - 1);
const currentSlide = computed((): Slide => slides.value[index.value] ?? slides.value[0]!);

const next = (): void => {
  if (isLast.value) {
    emit('finished');
    return;
  }
  index.value += 1;
};

const back = (): void => {
  if (index.value > 0) index.value -= 1;
};
</script>

<template>
  <div>
    <div class="mb-6 flex justify-center gap-1.5" aria-hidden="true">
      <span
        v-for="(slide, dot) in slides"
        :key="slide.title"
        class="h-1.5 w-6 rounded-full transition-colors"
        :class="dot <= index ? 'bg-primary' : 'bg-elevated'"
      />
    </div>

    <section
      :key="index"
      class="rise flex flex-col items-center gap-4 py-6 text-center"
      aria-live="polite"
    >
      <span class="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <UIcon :name="currentSlide.icon" class="size-8 text-primary" aria-hidden="true" />
      </span>
      <h1 class="font-serif text-3xl tracking-tight sm:text-4xl">{{ currentSlide.title }}</h1>
      <p class="max-w-sm text-muted">{{ currentSlide.lead }}</p>
    </section>

    <div class="mt-6 flex gap-3">
      <UButton
        v-if="index > 0"
        variant="ghost"
        color="neutral"
        size="xl"
        icon="i-lucide-arrow-left"
        @click="back"
      >
        {{ $t('onboarding.intro.back') }}
      </UButton>
      <UButton
        class="ml-auto font-semibold text-white"
        size="xl"
        trailing-icon="i-lucide-arrow-right"
        @click="next"
      >
        {{ isLast ? $t('onboarding.intro.start') : $t('onboarding.intro.next') }}
      </UButton>
    </div>
  </div>
</template>
