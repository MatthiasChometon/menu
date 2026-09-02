export type EquipmentItemId =
  | 'knife'
  | 'cuttingBoard'
  | 'scale'
  | 'mixingBowl'
  | 'ladle'
  | 'colander'
  | 'ovenTray'
  | 'cookingVessel'
  | 'container';

export type EquipmentItem = {
  id: EquipmentItemId;
  icon: string;
  /** How many are needed, when the plan says so — a knife is just a knife. */
  count?: number;
};
