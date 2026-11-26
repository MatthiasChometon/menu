import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Kind, parse, type DefinitionNode } from 'graphql';
import type { TestApp } from '../testing/e2e-app';

// What the API really offers, read from the code that declares it and not from a list kept next
// to the tests: the schema the app wrote when it started, and the routes of its controllers.

const SCHEMA_FILE = join(process.cwd(), 'infrastructure/graphql/schema.gql');

export type GraphqlOperations = { queries: string[]; mutations: string[] };

const fieldsOf = (definitions: readonly DefinitionNode[], typeName: string): string[] =>
  definitions.flatMap((definition): string[] =>
    definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name.value === typeName
      ? (definition.fields ?? []).map((field): string => field.name.value)
      : [],
  );

/** Every query and mutation of the GraphQL schema, by name. */
export const graphqlOperations = async (): Promise<GraphqlOperations> => {
  const { definitions } = parse(await readFile(SCHEMA_FILE, 'utf8'));

  return {
    queries: fieldsOf(definitions, 'Query').sort(),
    mutations: fieldsOf(definitions, 'Mutation').sort(),
  };
};

const joinPath = (...parts: string[]): string =>
  `/${parts
    .flatMap((part): string[] => part.split('/'))
    .filter((segment): boolean => segment !== '')
    .join('/')}`;

const stringOf = (metadata: unknown): string => (typeof metadata === 'string' ? metadata : '');

/** Every REST route of every controller, as `METHOD /path`. */
export const restRoutes = (api: TestApp): string[] => {
  const routes: string[] = [];

  for (const module of api.resolve(ModulesContainer).values()) {
    for (const { metatype } of module.controllers.values()) {
      if (metatype === null) continue;
      const prefix = stringOf(Reflect.getMetadata(PATH_METADATA, metatype));
      const prototype = metatype.prototype as Record<string, unknown>;

      for (const name of Object.getOwnPropertyNames(prototype)) {
        const handler = prototype[name];
        if (typeof handler !== 'function') continue;
        const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler);
        if (typeof method !== 'number') continue;
        const path = stringOf(Reflect.getMetadata(PATH_METADATA, handler));
        routes.push(`${RequestMethod[method]} ${joinPath(prefix, path)}`);
      }
    }
  }

  return [...new Set(routes)].sort();
};
