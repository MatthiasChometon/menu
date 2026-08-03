<script setup lang="ts" generic="Value extends string">
type Choice = { value: Value; label: string; hint?: string; icon?: string };

const { choices, modelValue } = defineProps<{
  choices: Choice[];
  modelValue: Value | undefined;
  legend: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [Value] }>();
</script>

<template>
  <fieldset>
    <legend class="mb-4 text-xl font-bold sm:text-2xl">{{ legend }}</legend>

    <div class="grid gap-3">
      <label
        v-for="choice in choices"
        :key="choice.value"
        class="flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-all hover:border-primary/60 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
        :class="
          modelValue === choice.value
            ? 'border-primary bg-primary/10'
            : 'border-default bg-elevated/40'
        "
      >
        <input
          type="radio"
          class="sr-only"
          :value="choice.value"
          :checked="modelValue === choice.value"
          @change="emit('update:modelValue', choice.value)"
        />
        <UIcon
          v-if="choice.icon"
          :name="choice.icon"
          class="size-7 shrink-0"
          :class="modelValue === choice.value ? 'text-primary' : 'text-muted'"
        />
        <span class="min-w-0">
          <span class="block font-semibold">{{ choice.label }}</span>
          <span v-if="choice.hint" class="block text-sm text-muted">{{ choice.hint }}</span>
        </span>
        <UIcon
          v-if="modelValue === choice.value"
          name="i-lucide-check"
          class="ml-auto size-5 shrink-0 text-primary"
        />
      </label>
    </div>
  </fieldset>
</template>
