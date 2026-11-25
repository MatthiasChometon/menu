<script setup lang="ts">
const { namespace } = defineProps<{ namespace: 'notice' | 'privacy' | 'terms' }>();

const { t, tm, rt } = useNuxtApp().$i18n;

type Section = { title: string; body: string[] };
type Texts = { title: string; lead: string; sections: unknown };

// Every key spelled out, one document at a time: a key assembled from the
// namespace cannot be found by a search, nor checked against the locale files.
const textsOf = (): Texts => {
  switch (namespace) {
    case 'notice':
      return {
        title: t('legal.notice.title'),
        lead: t('legal.notice.lead'),
        sections: tm('legal.notice.sections'),
      };
    case 'privacy':
      return {
        title: t('legal.privacy.title'),
        lead: t('legal.privacy.lead'),
        sections: tm('legal.privacy.sections'),
      };
    case 'terms':
      return {
        title: t('legal.terms.title'),
        lead: t('legal.terms.lead'),
        sections: tm('legal.terms.sections'),
      };
  }
};

// tm() hands back raw messages: plain strings when nothing needs resolving, and
// compiled nodes otherwise. Reading both is what keeps the page from breaking
// the day a comma turns a line into something vue-i18n decides to compile.
const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (isMessage(value)) return rt(value);

  return '';
};

const isMessage = (value: unknown): value is Parameters<typeof rt>[0] =>
  typeof value === 'object' && value !== null;

const asSection = (raw: unknown): Section | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const fields = new Map<string, unknown>(Object.entries(raw));
  const body = fields.get('body');
  if (!Array.isArray(body)) return undefined;

  return { title: asText(fields.get('title')), body: body.map(asText) };
};

const texts = computed((): Texts => textsOf());

const sections = computed((): Section[] => {
  const raw = texts.value.sections;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): Section[] => {
    const section = asSection(entry);

    return section === undefined ? [] : [section];
  });
});

const title = computed((): string => texts.value.title);
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
        <p class="mt-2 text-lg text-muted">{{ texts.lead }}</p>
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
