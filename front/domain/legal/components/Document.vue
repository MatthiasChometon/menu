<script setup lang="ts">
const { namespace } = defineProps<{ namespace: 'notice' | 'privacy' | 'terms' }>();

const { t, tm, rt } = useNuxtApp().$i18n;

type Section = { title: string; body: string[] };

// tm() hands back raw messages: plain strings when nothing needs resolving, and
// compiled nodes otherwise. Reading both is what keeps the page from breaking
// the day a comma turns a line into something vue-i18n decides to compile.
const asText = (value: unknown): string =>
  typeof value === 'string' ? value : rt(value as Parameters<typeof rt>[0]);

const sections = computed((): Section[] =>
  (tm(`legal.${namespace}.sections`) as unknown[]).map((raw): Section => {
    const entry = raw as { title: unknown; body: unknown[] };

    return { title: asText(entry.title), body: entry.body.map(asText) };
  }),
);

const title = computed((): string => t(`legal.${namespace}.title`));
const contact = computed((): string => String(useRuntimeConfig().public.legalContact));

useSeoMeta({ title: (): string => title.value });
</script>

<template>
  <UContainer class="py-8">
    <!-- A measure, not the page width: these are paragraphs to be read, and a
         line running the width of a laptop is a line the eye loses. -->
    <article class="mx-auto max-w-2xl">
      <header class="mb-8">
        <h1 class="text-3xl font-black sm:text-4xl">{{ title }}</h1>
        <p class="mt-2 text-lg text-muted">{{ $t(`legal.${namespace}.lead`) }}</p>
        <p class="mt-4 text-sm text-dimmed">{{ $t('legal.updated') }}</p>
      </header>

      <div class="space-y-8">
        <section v-for="section in sections" :key="section.title">
          <h2 class="text-xl font-bold">{{ section.title }}</h2>
          <div class="mt-2 space-y-3">
            <p v-for="(paragraph, index) in section.body" :key="index" class="leading-relaxed">
              {{ paragraph }}
            </p>
          </div>
        </section>
      </div>

      <!-- Read from configuration, so swapping the address is one line in
           netlify.toml rather than an edit across two languages. -->
      <footer class="mt-10 border-t border-default pt-6">
        <p class="text-sm text-muted">
          {{ $t('legal.contactLabel') }}
          <ULink :to="`mailto:${contact}`" class="font-medium text-primary">{{ contact }}</ULink>
        </p>
      </footer>
    </article>
  </UContainer>
</template>
