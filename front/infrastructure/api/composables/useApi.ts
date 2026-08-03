/* eslint-disable @typescript-eslint/explicit-function-return-type */
// useFetch's return type is impractical to write out by hand; inference is the
// documented way to wrap it.
import type { UseFetchOptions } from 'nuxt/app';

export const useApi = <DataT>(
  url: string | (() => string),
  options: UseFetchOptions<DataT> = {},
) => {
  const { $api } = useNuxtApp();

  return useFetch(url, {
    // These calls are actions, not page data: they fire when the user asks.
    immediate: false,
    watch: false,
    ...options,
    // The custom $fetch needs this cast; it is the recipe from the Nuxt docs.
    $fetch: $api as typeof $fetch,
  });
};
