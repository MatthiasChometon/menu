<script setup lang="ts">
import type { MeasurementsInput } from '#gql';

const { members, isLoading, add, update, remove } = useHousehold();

// The same ceiling the API enforces. Repeated here so the button disappears
// before somebody fills a form they are not allowed to save, not to be the
// thing that stops them: the server refuses regardless.
const MAX_MEMBERS = 12;

type Draft = { id?: string; name: string; answers?: MeasurementsInput };

const draft = ref<Draft>();
const isNaming = ref(true);
const removing = ref<string>();
const hasFailed = ref(false);

const startAdding = (): void => {
  draft.value = { name: '' };
  isNaming.value = true;
  hasFailed.value = false;
};

const startEditing = (member: Member): void => {
  draft.value = { id: member.id, name: member.name, answers: answersOfMember(member) };
  isNaming.value = true;
  hasFailed.value = false;
};

const close = (): void => {
  draft.value = undefined;
};

// The name is asked first and on its own: it is one short answer, and putting
// it inside the wizard would mean a ninth step that is not a question about
// anybody's body.
const saveAnswers = async (answers: MeasurementsInput): Promise<void> => {
  const current = draft.value;
  if (current === undefined) return;

  if (current.id === undefined) await add(current.name, answers);
  else await update(current.id, current.name, answers);

  close();
};

const confirmRemoval = async (id: string): Promise<void> => {
  removing.value = undefined;
  hasFailed.value = false;

  try {
    await remove(id);
  } catch {
    hasFailed.value = true;
  }
};
</script>

<template>
  <section class="mt-10">
    <h2 class="text-xl font-bold sm:text-2xl">{{ $t('profile.household.title') }}</h2>
    <p class="mt-1 mb-5 text-muted">{{ $t('profile.household.lead') }}</p>

    <div v-if="isLoading" class="grid gap-2">
      <USkeleton v-for="row in 2" :key="row" class="h-16 rounded-2xl" />
      <span class="sr-only">{{ $t('accessibility.loading') }}</span>
    </div>

    <!-- Filling somebody in takes over the section: the list underneath would
         only be a reminder of what is not being edited. -->
    <div v-else-if="draft !== undefined" class="rounded-2xl border border-default p-4 sm:p-5">
      <div v-if="isNaming">
        <UFormField :label="$t('profile.household.name')" class="mb-5">
          <UInput
            v-model="draft.name"
            size="xl"
            autofocus
            :placeholder="$t('profile.household.namePlaceholder')"
            @keyup.enter="draft.name.trim() !== '' && (isNaming = false)"
          />
        </UFormField>

        <div class="flex gap-3">
          <UButton color="neutral" variant="ghost" size="xl" @click="close">
            {{ $t('profile.household.cancel') }}
          </UButton>
          <UButton
            class="ml-auto font-semibold text-white"
            size="xl"
            trailing-icon="i-lucide-arrow-right"
            :disabled="draft.name.trim() === ''"
            @click="isNaming = false"
          >
            {{ $t('profile.household.continue') }}
          </UButton>
        </div>
      </div>

      <div v-else>
        <p class="mb-5 font-semibold">
          {{ $t('profile.household.answersFor', { name: draft.name.trim() }) }}
        </p>
        <ProfileForm :initial="draft.answers" :save="saveAnswers" @saved="close" />
      </div>
    </div>

    <template v-else>
      <p v-if="members.length === 0" class="mb-4 text-muted">
        {{ $t('profile.household.empty') }}
      </p>

      <ul v-else class="mb-4 grid gap-2">
        <li
          v-for="member in members"
          :key="member.id"
          class="rounded-2xl border border-default bg-elevated/40 px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ member.name }}</p>
              <p class="text-sm text-muted tabular-nums">
                {{ $t('profile.household.kcalPerDay', { kcal: member.targets.kcal }) }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              :aria-label="$t('profile.household.edit', { name: member.name })"
              @click="startEditing(member)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              :aria-label="$t('profile.household.remove', { name: member.name })"
              @click="removing = member.id"
            />
          </div>

          <!-- Asked in place rather than in a dialog: the name being removed
               stays on screen, above the button that removes it. -->
          <div
            v-if="removing === member.id"
            class="mt-3 flex flex-wrap items-center gap-3 border-t border-default pt-3"
          >
            <p class="text-sm">
              {{ $t('profile.household.removeConfirm', { name: member.name }) }}
            </p>
            <div class="ml-auto flex gap-2">
              <UButton color="neutral" variant="ghost" @click="removing = undefined">
                {{ $t('profile.household.cancel') }}
              </UButton>
              <UButton color="error" @click="confirmRemoval(member.id)">
                {{ $t('profile.household.removeYes') }}
              </UButton>
            </div>
          </div>
        </li>
      </ul>

      <UAlert
        v-if="hasFailed"
        class="mb-4"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="$t('profile.household.error')"
      />

      <p v-if="members.length >= MAX_MEMBERS" class="text-muted">
        {{ $t('profile.household.full') }}
      </p>
      <UButton
        v-else
        size="xl"
        block
        variant="outline"
        icon="i-lucide-user-plus"
        @click="startAdding"
      >
        {{ $t('profile.household.add') }}
      </UButton>
    </template>
  </section>
</template>
