/**
 * The time budgets of the API, one per operation, taken from the UX rules the product is held
 * to and never from what the code does today. A budget that is missed is a bug in the code:
 * loosening one needs the maintainer's say-so.
 *
 * | UX rule                                                  | Number                 |
 * | -------------------------------------------------------- | ---------------------- |
 * | Doherty threshold, a mutation from click to result       | 400 ms end to end      |
 * | The API's share of that, once network and render took    |                        |
 * | theirs                                                   | 250 ms (p95)           |
 * | A read that feeds a screen                               | p95 300 ms, p99 800 ms |
 * | Anything past one second must show progress              | 1 s                    |
 * | Background work, Nielsen's attention limit               | 10 s                   |
 *
 * `devops/load` holds every operation to these over HTTP, with the API on one CPU and the
 * database at the pool size of the shared host.
 * `back/infrastructure/testing/time-budget.ts` holds the same operations to a median in process.
 */

export type BudgetClass = 'read' | 'mutation' | 'credential' | 'upload';

export type Budget = { p95: number; p99: number; rule: string };

export const BUDGETS: Record<BudgetClass, Budget> = {
  read: { p95: 300, p99: 800, rule: 'API read feeding a screen: p95 300 ms' },
  mutation: { p95: 250, p99: 800, rule: 'Doherty 400 ms end to end, API share p95 250 ms' },
  // A sign-in, a sign-up and an account deletion are mutations like the others: the plan gives no
  // more room for hashing a password, so the code stays inside the mutation numbers.
  credential: { p95: 250, p99: 800, rule: 'Doherty 400 ms end to end, API share p95 250 ms' },
  // A photograph is resized on the server, and it is a mutation too: the plan gives it the same
  // API share. Past one second a progress bar would be needed; it never gets near.
  upload: { p95: 250, p99: 800, rule: 'Doherty 400 ms end to end, API share p95 250 ms' },
};

/** The spike may cost up to twice the budget while it lasts, and not a millisecond after. */
export const SURGE_FACTOR = 2;

/** A run that errs on more than this share of its requests is down, not slow. */
export const MAX_FAILED_RATE = 0.01;
export const MIN_CHECKS_RATE = 0.99;

/** The breakpoint run must hold at least this many requests per second before it gives way. */
export const BREAKPOINT_FLOOR_RPS = 20;

/** Every operation of the API and the class its budget comes from. */
export const OPERATION_CLASS = {
  // GraphQL queries
  amIAdmin: 'read',
  bugReports: 'read',
  googleEnabled: 'read',
  groceryJob: 'read',
  groceryPushKey: 'read',
  householdMembers: 'read',
  improvementRequests: 'read',
  me: 'read',
  myCustomFoods: 'read',
  myCustomRecipes: 'read',
  myGroceryDevices: 'read',
  myGroceryJobs: 'read',
  myGroceryPreference: 'read',
  myGrocerySlotWindows: 'read',
  myProfile: 'read',
  myWeekPlan: 'read',
  myWeekPlans: 'read',
  myWeightEntries: 'read',
  nutritionTargets: 'read',
  // GraphQL mutations
  addHouseholdMember: 'mutation',
  addWeightEntry: 'mutation',
  adjustNutritionTargets: 'mutation',
  blockAccount: 'mutation',
  claimGroceryJob: 'mutation',
  createCustomFood: 'mutation',
  createCustomRecipe: 'mutation',
  createGroceryJob: 'mutation',
  deleteCustomFood: 'mutation',
  deleteCustomRecipe: 'mutation',
  deleteWeekPlan: 'mutation',
  deleteWeightEntry: 'mutation',
  finishGroceryJob: 'mutation',
  pairGroceryDevice: 'mutation',
  removeHouseholdMember: 'mutation',
  reportBug: 'mutation',
  reportCarrefourSession: 'mutation',
  reportGroceryJobEvent: 'mutation',
  requestImprovement: 'mutation',
  saveGroceryPreference: 'mutation',
  saveGrocerySlotWindows: 'mutation',
  saveProfile: 'mutation',
  saveWeekPlan: 'mutation',
  setBugStatus: 'mutation',
  setImprovementStatus: 'mutation',
  subscribeToGroceryPush: 'mutation',
  unpairGroceryDevice: 'mutation',
  unsubscribeFromGroceryPush: 'mutation',
  updateCustomFood: 'mutation',
  updateCustomRecipe: 'mutation',
  updateHouseholdMember: 'mutation',
  updateWeightEntry: 'mutation',
  // REST routes
  health: 'read',
  healthReady: 'read',
  googleStart: 'read',
  googleCallback: 'read',
  login: 'credential',
  register: 'credential',
  logout: 'mutation',
  verifyEmail: 'mutation',
  resendVerification: 'mutation',
  forgotPassword: 'mutation',
  resetPassword: 'credential',
  deleteAccount: 'credential',
  uploadImage: 'upload',
} as const satisfies Record<string, BudgetClass>;

export type OperationName = keyof typeof OPERATION_CLASS;

export const OPERATION_NAMES = Object.keys(OPERATION_CLASS) as OperationName[];

export const budgetOf = (name: OperationName): Budget => BUDGETS[OPERATION_CLASS[name]];
