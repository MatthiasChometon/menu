export type BatchTask = {
  recipe: Recipe;
  servings: number;
  quantities: FoodQuantity[];
  minutes: number;
};

// One entry in the Sunday roadmap: when the cook picks a dish up, how long it
// needs full attention before it can be left to itself, and when it is done.
// Several steps overlap on purpose — a dish simmering unattended is exactly
// what frees the cook to start the next one.
export type BatchTimelineStep = {
  task: BatchTask;
  startsAt: number;
  handsOnUntil: number;
  endsAt: number;
};

export type BatchPlan = {
  tasks: BatchTask[];
  freshTasks: BatchTask[];
  totalMinutes: number;
  timeline: BatchTimelineStep[];
  /** Wall-clock length of the session: shorter than totalMinutes whenever a
   *  dish simmers while another is being handled. */
  makespanMinutes: number;
};
