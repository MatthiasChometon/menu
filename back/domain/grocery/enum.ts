import { registerEnumType } from '@nestjs/graphql';

export enum GroceryJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

registerEnumType(GroceryJobStatus, {
  name: 'GroceryJobStatus',
  description:
    'Where an order run stands. BLOCKED means the shop asked for something a machine must not answer: a sign-in, a captcha.',
});

// What a run may end as. Kept apart from the statuses so a browser cannot put a
// run back to PENDING or RUNNING by naming it.
export enum GroceryJobOutcome {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

registerEnumType(GroceryJobOutcome, {
  name: 'GroceryJobOutcome',
  description: 'How a run ended.',
});

export enum GroceryJobEventKind {
  STARTED = 'STARTED',
  CART_EMPTIED = 'CART_EMPTIED',
  LINE_ADDED = 'LINE_ADDED',
  LINE_SUBSTITUTED = 'LINE_SUBSTITUTED',
  LINE_MISSING = 'LINE_MISSING',
  SLOT_BOOKED = 'SLOT_BOOKED',
  SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
  FINISHED = 'FINISHED',
  BLOCKED = 'BLOCKED',
}

registerEnumType(GroceryJobEventKind, {
  name: 'GroceryJobEventKind',
  description: 'What a run reported while it was working.',
});
