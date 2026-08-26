import { registerEnumType } from '@nestjs/graphql';

// How much the person wants it — the one tap that lets a long wish list be read
// by demand rather than by date. The mirror of a bug's severity: asked once,
// never required to be precise.
export enum ImprovementImportance {
  NICE_TO_HAVE = 'NICE_TO_HAVE',
  WOULD_HELP = 'WOULD_HELP',
  IMPORTANT = 'IMPORTANT',
}

// Where a suggestion stands. Richer than a bug's because an idea has a middle:
// it can be accepted and waiting long before it is done.
export enum ImprovementStatus {
  NEW = 'NEW',
  PLANNED = 'PLANNED',
  DONE = 'DONE',
  DECLINED = 'DECLINED',
}

registerEnumType(ImprovementImportance, {
  name: 'ImprovementImportance',
  description:
    'How much the idea matters to the person asking. One tap, so a list of wishes can be sorted by the ones people actually want.',
});

registerEnumType(ImprovementStatus, {
  name: 'ImprovementStatus',
  description: 'Where a suggestion stands, from just-in to shipped or set aside.',
});
