import 'reflect-metadata';
import { globSync } from 'node:fs';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { describe, expect, it } from 'vitest';

// A field typed `X | undefined` (exactOptionalPropertyTypes) reflects as
// Object, so Nest cannot build the schema unless the decorator names the type.
// That only shows when the app boots, which unit tests never do.
describe('the GraphQL models', () => {
  it('all resolve a type for every field', async () => {
    for (const file of globSync('domain/**/{model,input}.ts')) await import(`../../${file}`);

    expect(() => LazyMetadataStorage.load()).not.toThrow();
  });
});
