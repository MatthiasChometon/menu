export type WeightEntry = {
  id: string;
  /** Calendar date the weigh-in happened on, `YYYY-MM-DD`. */
  date: string;
  kg: number;
};

export type WeightDraft = {
  date: string;
  kg: number;
};
