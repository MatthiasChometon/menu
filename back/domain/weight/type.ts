export type WeightEntryRecord = {
  id: string;
  /** Calendar date the weigh-in happened on, `YYYY-MM-DD`. */
  date: string;
  kg: number;
};

export type WeightEntryDraft = {
  date: string;
  kg: number;
};
