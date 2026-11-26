import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OPERATION_CLASS, REST_ROUTES } from '../../../devops/load/budgets';
import { startTestApp, type TestApp } from '../testing/e2e-app';
import { graphqlOperations, restRoutes } from './discover';
import { MUTATIONS, QUERIES } from './operations';
import { buildRest } from './rest';

// Nothing the API offers may go without a time budget in the back tests and a scenario in the
// k6 suite. The expected set comes from the API itself (its schema and its controllers), so a
// resolver or a route added tomorrow turns this red until both exist.

let api: TestApp;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

const sorted = (names: string[]): string[] => [...names].sort();
const namesOf = (operations: { name: string }[]): string[] =>
  sorted(operations.map((operation): string => operation.name));

describe('every operation of the API has a budget test and a k6 scenario', () => {
  it('has a budget test for each query and each mutation, and none for a missing one', async () => {
    const { queries, mutations } = await graphqlOperations();

    expect(namesOf(QUERIES)).toEqual(queries);
    expect(namesOf(MUTATIONS)).toEqual(mutations);
  });

  it('has a budget test for each REST route, and none for a missing one', () => {
    expect(namesOf(buildRest(Buffer.alloc(0)))).toEqual(restRoutes(api));
  });

  it('has a k6 scenario and budget for each query and each mutation', async () => {
    const { queries, mutations } = await graphqlOperations();
    const known = Object.keys(OPERATION_CLASS);

    expect(
      sorted(known.filter((name): boolean => [...queries, ...mutations].includes(name))),
    ).toEqual(sorted([...queries, ...mutations]));
  });

  it('has a k6 scenario and budget for each REST route, and no other', () => {
    expect(sorted(Object.keys(REST_ROUTES))).toEqual(restRoutes(api));
  });

  it('puts every k6 operation in the budget class of its back test', () => {
    const classOf: Record<string, string> = OPERATION_CLASS;
    const restName = (route: string): string | undefined =>
      (REST_ROUTES as Record<string, string>)[route];

    for (const operation of [...QUERIES, ...MUTATIONS, ...buildRest(Buffer.alloc(0))]) {
      const name = restName(operation.name) ?? operation.name;
      expect(classOf[name], `${operation.name} has no budget class in devops/load`).toBe(
        operation.budget,
      );
    }
  });

  it('has no k6 operation the API does not offer', async () => {
    const { queries, mutations } = await graphqlOperations();
    const offered = new Set<string>([...queries, ...mutations, ...Object.values(REST_ROUTES)]);

    expect(Object.keys(OPERATION_CLASS).filter((name): boolean => !offered.has(name))).toEqual([]);
  });
});
