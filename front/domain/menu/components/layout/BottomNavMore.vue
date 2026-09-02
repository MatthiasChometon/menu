<script setup lang="ts">
const open = defineModel<boolean>({ required: true });

const { moreEntries, isCurrent } = useNavigation();

const close = (): void => {
  open.value = false;
};
</script>

<template>
  <USlideover v-model:open="open" side="bottom" :title="$t('menu.nav.more')">
    <template #body>
      <ul class="grid grid-cols-2 gap-2">
        <li v-for="entry in moreEntries" :key="entry.to">
          <NuxtLink
            :to="entry.to"
            class="flex items-center gap-3 rounded-lg border border-default px-4 py-3 transition-colors"
            :class="isCurrent(entry.to) ? 'border-primary bg-primary/5 text-primary' : 'text-default'"
            :aria-current="isCurrent(entry.to) ? 'page' : undefined"
            @click="close"
          >
            <UIcon :name="entry.icon" class="size-5 shrink-0" />
            <span class="font-medium">{{ entry.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </USlideover>
</template>
