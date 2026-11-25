import type { AnyServerRouteMethod, KeysOf, UseFetchOptions } from 'nuxt/app';

export const useApi = <DataT>(
  url: string | (() => string),
  // Nuxt types `method` from the server routes it knows and defaults to GET only;
  // these calls go to an external API, so every method is accepted.
  options: UseFetchOptions<
    DataT,
    DataT,
    KeysOf<DataT>,
    undefined,
    string,
    AnyServerRouteMethod
  > = {},
): ReturnType<typeof useFetch<DataT>> => {
  const { $api } = useNuxtApp();

  const call = useFetch(url, {
    // A default a caller can still relax by watching a source to refetch.
    watch: false,
    ...options,
    // Always manual: these calls are actions that fire on execute(), never on
    // mount. Set after the caller's options so it can never be turned on.
    immediate: false,
    // The custom $fetch needs this cast; it is the recipe from the Nuxt docs.
    $fetch: $api as typeof $fetch,
  });

  // useFetch's own generics differ only by an `extends void` guard that is moot
  // for a real DataT; one boundary cast gives the wrapper a written return type
  // rather than turning the rule off for the whole file.
  return call as ReturnType<typeof useFetch<DataT>>;
};
