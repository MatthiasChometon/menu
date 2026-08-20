import { registerEnumType } from '@nestjs/graphql';

export enum BugSeverity {
  BLOCKING = 'BLOCKING',
  ANNOYING = 'ANNOYING',
  COSMETIC = 'COSMETIC',
}

export enum BugStatus {
  NEW = 'NEW',
  FIXED = 'FIXED',
  DISMISSED = 'DISMISSED',
}

registerEnumType(BugSeverity, {
  name: 'BugSeverity',
  description:
    'How much the problem got in the way. Asked as one tap, because a list where everything looks equally urgent is a list nobody triages.',
});

registerEnumType(BugStatus, {
  name: 'BugStatus',
  description: 'Where a report stands. Without it the list only ever grows.',
});
