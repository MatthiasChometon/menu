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
