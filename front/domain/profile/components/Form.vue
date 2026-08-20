<script setup lang="ts">
import type { MeasurementsInput } from '#gql';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from '#gql/default';

// `save` lets the same wizard fill in somebody else's answers: the questions
// and the live preview are identical, only the destination changes.
const { initial, save: saveAnswers } = defineProps<{
  initial?: MeasurementsInput;
  save?: (answers: MeasurementsInput) => Promise<unknown>;
}>();
const emit = defineEmits<{ saved: [] }>();

const { t } = useNuxtApp().$i18n;
const { goals, sexes, activities, trainingTypes, starchQualities, appetites } = useProfileChoices();
const { save: saveMyProfile } = useProfile();

// Sensible middle-of-the-road answers, so nobody faces an empty form.
const answers = reactive<MeasurementsInput>(
  initial ?? {
    sex: Sex.FEMALE,
    age: 40,
    heightCm: 168,
    weightKg: 65,
    dailyActivity: DailyActivity.SEATED,
    trainingDaysPerWeek: 2,
    trainingType: TrainingType.MIXED,
    starchQuality: StarchQuality.MIXED,
    appetite: Appetite.AVERAGE,
    goal: Goal.MAINTAIN,
  },
);

const stepIndex = ref(0);
const steps = ['goal', 'sex', 'body', 'dailyActivity', 'training', 'starch', 'appetite', 'summary'];
const isLast = computed((): boolean => stepIndex.value === steps.length - 1);
const currentStep = computed((): string => steps[stepIndex.value] ?? 'goal');

// Previewed live from the answers so far, which is what makes the last step
// feel like a result rather than a form submission.
const { data: preview, refresh: refreshPreview } = useAsyncData(
  'targets-preview',
  async () => (await GqlNutritionTargets({ input: { ...answers } })).nutritionTargets,
  { server: false, immediate: false },
);

const isSaving = ref(false);
const hasFailed = ref(false);

const next = async (): Promise<void> => {
  if (isLast.value) return submit();

  stepIndex.value += 1;
  if (isLast.value) await refreshPreview();
};

const back = (): void => {
  if (stepIndex.value > 0) stepIndex.value -= 1;
};

// Failure is what was thrown, not what came back: a destination that saves
// without returning anything is still a destination that saved.
const submit = async (): Promise<void> => {
  isSaving.value = true;
  hasFailed.value = false;

  try {
    await (saveAnswers ?? saveMyProfile)({ ...answers });
  } catch {
    hasFailed.value = true;
    return;
  } finally {
    isSaving.value = false;
  }

  emit('saved');
};

const summaryRows = computed((): { label: string; value: string }[] =>
  preview.value === undefined
    ? []
    : [
        { label: t('profile.summary.kcal'), value: `${preview.value.kcal} kcal` },
        { label: t('profile.summary.protein'), value: `${preview.value.protein} g` },
        { label: t('profile.summary.fat'), value: `${preview.value.fat} g` },
        { label: t('profile.summary.carbs'), value: `${preview.value.carbs} g` },
        { label: t('profile.summary.fiber'), value: `${preview.value.fiber} g` },
      ],
);
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <p class="mb-2 text-sm text-muted">
        {{ $t('profile.onboarding.step') }} {{ stepIndex + 1 }} {{ $t('profile.onboarding.of') }}
        {{ steps.length }}
      </p>
      <UProgress :model-value="((stepIndex + 1) / steps.length) * 100" size="sm" />
    </div>

    <ProfileChoiceGroup
      v-if="currentStep === 'goal'"
      v-model="answers.goal"
      :choices="goals"
      :legend="$t('profile.goal.question')"
    />

    <div v-else-if="currentStep === 'sex'">
      <ProfileChoiceGroup
        v-model="answers.sex"
        :choices="sexes"
        :legend="$t('profile.sex.question')"
      />
      <p class="mt-3 text-sm text-muted">{{ $t('profile.sex.why') }}</p>
    </div>

    <fieldset v-else-if="currentStep === 'body'">
      <legend class="mb-4 text-xl font-bold sm:text-2xl">{{ $t('profile.body.question') }}</legend>
      <div class="grid gap-4">
        <UFormField :label="$t('profile.body.age')">
          <UInput
            v-model.number="answers.age"
            type="number"
            inputmode="numeric"
            size="xl"
            :ui="{ trailing: 'pointer-events-none' }"
          >
            <template #trailing>
              <span class="text-sm text-muted">{{ $t('profile.body.ageUnit') }}</span>
            </template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('profile.body.heightCm')">
          <UInput v-model.number="answers.heightCm" type="number" inputmode="numeric" size="xl">
            <template #trailing>
              <span class="text-sm text-muted">{{ $t('profile.body.heightUnit') }}</span>
            </template>
          </UInput>
        </UFormField>
        <UFormField :label="$t('profile.body.weightKg')">
          <UInput v-model.number="answers.weightKg" type="number" inputmode="numeric" size="xl">
            <template #trailing>
              <span class="text-sm text-muted">{{ $t('profile.body.weightUnit') }}</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </fieldset>

    <ProfileChoiceGroup
      v-else-if="currentStep === 'dailyActivity'"
      v-model="answers.dailyActivity"
      :choices="activities"
      :legend="$t('profile.dailyActivity.question')"
    />

    <fieldset v-else-if="currentStep === 'training'">
      <legend class="mb-4 text-xl font-bold sm:text-2xl">
        {{ $t('profile.training.question') }}
      </legend>
      <UFormField :label="$t('profile.training.days')" class="mb-5">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="day in [0, 1, 2, 3, 4, 5, 6, 7]"
            :key="day"
            :variant="answers.trainingDaysPerWeek === day ? 'solid' : 'outline'"
            :color="answers.trainingDaysPerWeek === day ? 'primary' : 'neutral'"
            size="lg"
            class="w-12 justify-center"
            :aria-pressed="answers.trainingDaysPerWeek === day"
            @click="answers.trainingDaysPerWeek = day"
          >
            {{ day }}
          </UButton>
        </div>
      </UFormField>

      <ProfileChoiceGroup
        v-if="answers.trainingDaysPerWeek > 0"
        v-model="answers.trainingType"
        :choices="trainingTypes"
        :legend="$t('profile.training.type')"
      />
    </fieldset>

    <div v-else-if="currentStep === 'starch'">
      <ProfileChoiceGroup
        v-model="answers.starchQuality"
        :choices="starchQualities"
        :legend="$t('profile.starchQuality.question')"
      />
      <p class="mt-3 text-sm text-muted">{{ $t('profile.starchQuality.why') }}</p>
    </div>

    <div v-else-if="currentStep === 'appetite'">
      <ProfileChoiceGroup
        v-model="answers.appetite"
        :choices="appetites"
        :legend="$t('profile.appetite.question')"
      />
      <p class="mt-3 text-sm text-muted">{{ $t('profile.appetite.why') }}</p>
    </div>

    <section v-else>
      <h2 class="mb-1 text-xl font-bold sm:text-2xl">{{ $t('profile.summary.question') }}</h2>
      <p class="mb-5 text-muted">{{ $t('profile.summary.lead') }}</p>

      <dl v-if="preview" class="grid gap-2">
        <div
          v-for="row in summaryRows"
          :key="row.label"
          class="flex items-baseline justify-between rounded-xl border border-default bg-elevated/40 px-4 py-3"
        >
          <dt class="text-muted">{{ row.label }}</dt>
          <dd class="text-lg font-bold tabular-nums">{{ row.value }}</dd>
        </div>
      </dl>
      <div v-else class="grid gap-2">
        <USkeleton v-for="row in 5" :key="row" class="h-12 rounded-xl" />
      </div>

      <UAlert
        v-if="hasFailed"
        class="mt-4"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="$t('profile.settings.error')"
      />
    </section>

    <div class="mt-8 flex gap-3">
      <UButton
        v-if="stepIndex > 0"
        color="neutral"
        variant="ghost"
        size="xl"
        icon="i-lucide-arrow-left"
        @click="back"
      >
        {{ $t('profile.onboarding.back') }}
      </UButton>
      <UButton
        class="ml-auto font-semibold text-white"
        size="xl"
        :loading="isSaving"
        trailing-icon="i-lucide-arrow-right"
        @click="next"
      >
        {{
          isSaving
            ? $t('profile.onboarding.saving')
            : isLast
              ? $t('profile.onboarding.finish')
              : $t('profile.onboarding.next')
        }}
      </UButton>
    </div>
  </div>
</template>
