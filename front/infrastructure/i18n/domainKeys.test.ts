import { describe, expect, it } from 'vitest';

type Tree = { [key: string]: string | string[] | Tree };

const messages = import.meta.glob<Tree>('../../domain/*/translation/{fr,en}{,.shell}.json', {
  eager: true,
  import: 'default',
});
const sources = import.meta.glob<string>(['../../domain/**/*.{vue,ts}', '!**/*.test.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
});

const domainOf = (path: string): string => /domain\/([^/]+)\//.exec(path)?.[1] ?? '';

const has = (tree: Tree | undefined, path: string): boolean =>
  tree !== undefined &&
  path.split('.').reduce<Tree | string | string[] | undefined>((node, part) => {
    if (node === undefined || typeof node !== 'object' || Array.isArray(node)) return undefined;
    return node[part];
  }, tree) !== undefined;

const treeOf = (domain: string, kind: 'shell' | 'lazy'): Tree | undefined =>
  messages[`../../domain/${domain}/translation/fr${kind === 'shell' ? '.shell' : ''}.json`];

const domains = [...new Set(Object.keys(messages).map(domainOf))];
const rootOwner = new Map<string, string>(
  domains.flatMap((domain) =>
    [treeOf(domain, 'shell'), treeOf(domain, 'lazy')].flatMap((tree) =>
      Object.keys(tree ?? {}).map((root): [string, string] => [root, domain]),
    ),
  ),
);

// The domains a page of `domain` loads: its own and the ones its pages name.
const pagesOf = (domain: string): string[] =>
  Object.keys(sources).filter((path) => domainOf(path) === domain && path.includes('/pages/'));

const loadedWith = (domain: string): Set<string> => {
  const named = pagesOf(domain).map(
    (page) =>
      new Set(
        [
          ...(/translations: \[([^\]]*)\]/.exec(sources[page] ?? '')?.[1] ?? '').matchAll(
            /'(\w+)'/g,
          ),
        ].map((match) => match[1] ?? ''),
      ),
  );
  const [first, ...others] = named;
  return first === undefined
    ? new Set()
    : new Set([...first].filter((name) => others.every((pages) => pages.has(name))));
};

describe('the messages another domain reads', () => {
  it('are in its shell, or in a domain every page of the reader loads', () => {
    const problems: string[] = [];
    for (const [path, source] of Object.entries(sources)) {
      const reader = domainOf(path);
      for (const match of source.matchAll(/['"`]([a-zA-Z]+)\.([a-zA-Z0-9_.]+)['"`]/g)) {
        const owner = rootOwner.get(match[1] ?? '');
        const key = `${match[1]}.${match[2]}`;
        if (owner === undefined || owner === reader) continue;
        if (!has(treeOf(owner, 'lazy'), key)) continue;
        if (loadedWith(reader).has(owner)) continue;
        problems.push(`${path} reads ${key}, which ${owner} loads only with its own pages`);
      }
    }

    expect(problems).toEqual([]);
  });
});
