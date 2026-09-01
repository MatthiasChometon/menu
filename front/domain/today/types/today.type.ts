export type ReminderId = 'creatine' | 'water' | 'vitaminD';

export type ReminderItem = {
  id: ReminderId;
  icon: string;
  isChecked: boolean;
};

// The day and slot a meal falls on today, kept together: a card showing the
// meal always needs both, to open the right recipe and to mark the right slot
// eaten.
export type TodayMeal = {
  day: DayKey;
  meal: Meal;
};
