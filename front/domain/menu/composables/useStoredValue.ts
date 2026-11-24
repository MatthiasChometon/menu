type Guard<T> = (value: unknown) => value is T;

type StoredValue = {
  storedValue: <T>(key: string, fallback: T, isValid: Guard<T>) => Ref<T>;
  isRecordOf: <T>(isValid: Guard<T>) => Guard<Record<string, T>>;
  isArrayOf: <T>(isValid: Guard<T>) => Guard<T[]>;
};

// localStorage is the reader's browser, not our code: an old version of the app,
// another tab or a hand edit may have left anything under a key. A value is
// trusted only once it passes its guard; otherwise the fallback stands in.
export const useStoredValue = (): StoredValue => {
  const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

  const storedValue = <T>(key: string, fallback: T, isValid: Guard<T>): Ref<T> =>
    useLocalStorage<T>(key, fallback, {
      serializer: {
        read: (raw: string): T => {
          try {
            const parsed: unknown = JSON.parse(raw);
            return isValid(parsed) ? parsed : fallback;
          } catch {
            return fallback;
          }
        },
        write: (value: T): string => JSON.stringify(value),
      },
    });

  const isRecordOf =
    <T>(isValid: Guard<T>): Guard<Record<string, T>> =>
    (value): value is Record<string, T> =>
      isObject(value) && !Array.isArray(value) && Object.values(value).every(isValid);

  const isArrayOf =
    <T>(isValid: Guard<T>): Guard<T[]> =>
    (value): value is T[] =>
      Array.isArray(value) && value.every(isValid);

  return { storedValue, isRecordOf, isArrayOf };
};
