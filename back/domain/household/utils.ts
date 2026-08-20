// Kept as a function rather than a class: these are consumed inside decorators,
// which cannot take an injected dependency.
export const householdConstraints = (): { maxNameLength: number; maxMembers: number } => ({
  maxNameLength: 40,
  // A ceiling rather than a rule about families: it stops a runaway script from
  // filling the table, and no kitchen weighs for more than this at once.
  maxMembers: 12,
});
