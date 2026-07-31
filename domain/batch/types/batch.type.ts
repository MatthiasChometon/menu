export type BatchTask = {
  recipe: Recipe;
  servings: number;
  quantities: FoodQuantity[];
  minutes: number;
};

export type BatchPlan = {
  tasks: BatchTask[];
  freshTasks: BatchTask[];
  totalMinutes: number;
};
