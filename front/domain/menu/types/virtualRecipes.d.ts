declare module 'virtual:recipe-catalog' {
  const catalog: Record<string, import('../composables/useCatalogBuilder').RawRecipe>;
  export default catalog;
}

declare module 'virtual:recipe-steps' {
  const loaders: Record<string, () => Promise<{ default: import('./menu.type').LocalizedSteps }>>;
  export default loaders;
}
