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
