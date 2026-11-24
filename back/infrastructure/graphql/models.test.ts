import 'reflect-metadata';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A field typed `X | undefined` (exactOptionalPropertyTypes) reflects as
// Object, so Nest cannot build the schema unless the decorator names the type.
// That only shows when the app boots, which unit tests never do.
// Not exported by the package root, and its exports map hides the path from the
// type checker: reached by a runtime specifier instead.
const LAZY_STORAGE = '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
type LazyStorage = { LazyMetadataStorage: { load: () => void } };

describe('the GraphQL models', () => {
  it('all resolve a type for every field', async () => {
    for (const file of globSync('domain/**/{model,input}.ts')) await import(`../../${file}`);

    const { LazyMetadataStorage } = (await import(LAZY_STORAGE)) as LazyStorage;

    expect(() => LazyMetadataStorage.load()).not.toThrow();
    // Importing every model is slow on a busy machine.
  }, 30_000);
});
