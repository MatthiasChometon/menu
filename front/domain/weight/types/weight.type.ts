import type { MyWeightEntriesQuery } from '#gql';

export type WeightEntry = MyWeightEntriesQuery['myWeightEntries'][number];

export type WeightDraft = {
  date: string;
  kg: number;
};
