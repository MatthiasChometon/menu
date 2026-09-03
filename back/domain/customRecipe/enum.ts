import { registerEnumType } from '@nestjs/graphql';

// Mirrors the front's own RecipeSlot rather than the week plan's meal slots:
// a dish here fills a place in the composer (which meal group it belongs to),
// not a single day's slot, and "main" alone covers both lunch and dinner the
// way every site recipe already does.
export enum CustomRecipeSlot {
  MAIN = 'MAIN',
  BREAKFAST = 'BREAKFAST',
  POST_WORKOUT = 'POST_WORKOUT',
  SNACK = 'SNACK',
}

registerEnumType(CustomRecipeSlot, {
  name: 'CustomRecipeSlot',
  description: 'Which group of meals a custom recipe may fill, same shape as the site catalogue.',
});
