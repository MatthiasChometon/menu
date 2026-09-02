// A shelf entry as shown once it has left the active list: food and seasoning
// share only what a compact row needs, not the grammes or price of a full
// shopping line.
export type PantryEntry = {
  id: string;
  name: LocalizedText;
  icon: string;
};
