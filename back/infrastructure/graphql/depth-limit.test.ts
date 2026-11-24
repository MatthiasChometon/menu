import { buildSchema, parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';
import { depthLimit } from './depth-limit';

const schema = buildSchema(`
  type Node { child: Node, name: String }
  type Query { node: Node }
`);

const errorsFor = (query: string, maximum = 3): string[] =>
  validate(schema, parse(query), [depthLimit(maximum)]).map((error): string => error.message);

describe('the query depth limit', () => {
  it('accepts a query within the limit', () => {
    expect(errorsFor('{ node { child { name } } }')).toEqual([]);
  });

  it('rejects a query nested past the limit', () => {
    expect(errorsFor('{ node { child { child { name } } } }')).toHaveLength(1);
  });

  it('counts the levels hidden behind a fragment spread', () => {
    const query = `
      { node { ...Deep } }
      fragment Deep on Node { child { child { child { name } } } }
    `;

    expect(errorsFor(query)).toHaveLength(1);
  });

  it('counts the levels behind fragments that spread other fragments', () => {
    const query = `
      { node { ...A } }
      fragment A on Node { child { ...B } }
      fragment B on Node { child { child { name } } }
    `;

    expect(errorsFor(query)).toHaveLength(1);
  });

  it('does not loop on fragments that spread each other', () => {
    const query = `
      { node { ...A } }
      fragment A on Node { child { ...B } }
      fragment B on Node { child { ...A } }
    `;

    expect(() => errorsFor(query, 50)).not.toThrow();
  });
});

describe('the depth limit against a fragment bomb', () => {
  const bombOfSize = (size: number): string => {
    const fragments = Array.from({ length: size }, (_unused, index): string =>
      index === 0
        ? 'fragment F0 on Node { name }'
        : `fragment F${index} on Node { child { ...F${index - 1} ...F${index - 1} } }`,
    );

    return `{ node { ...F${size - 1} } } ${fragments.join(' ')}`;
  };

  it('answers at once and still reports the depth', () => {
    const started = performance.now();

    const errors = errorsFor(bombOfSize(30));

    expect(performance.now() - started).toBeLessThan(500);
    expect(errors).toHaveLength(1);
  });
});
