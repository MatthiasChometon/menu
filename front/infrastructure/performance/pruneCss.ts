import postcss, { type AtRule, type Container, type Rule } from 'postcss';

// Nuxt UI writes the classes of every variant of every component it ships to the
// stylesheet (7 colours x 4 variants x sizes, and so on): 190 KB of rules the pages
// never match, which the browser still parses, matches against each element and lays
// out around. A rule can only match if each class it names outside :not(), :where()
// and the like appears somewhere in what the site ships; one that names a class found
// nowhere is dead and goes.
const BACKSLASH = String.fromCharCode(92);
const CLASS_CHARACTER = /[A-Za-z0-9_-]/;
const HEX_DIGIT = /[0-9A-Fa-f]/;

// Undefined when the selector escapes a character as hex (`\31 0`): cheaper to keep it
// than to decode it.
export const requiredClassesOf = (selector: string): string[] | undefined => {
  const classes: string[] = [];
  let depth = 0;
  let index = 0;

  while (index < selector.length) {
    const character = selector.charAt(index);
    if (character === BACKSLASH) {
      index += 2;
      continue;
    }
    if (character === '(' || character === '[') depth += 1;
    else if (character === ')' || character === ']') depth -= 1;
    else if (character === '.' && depth === 0) {
      let name = '';
      index += 1;
      while (index < selector.length) {
        const next = selector.charAt(index);
        if (next === BACKSLASH) {
          const escaped = selector.charAt(index + 1);
          if (HEX_DIGIT.test(escaped)) return undefined;
          name += escaped;
          index += 2;
        } else if (CLASS_CHARACTER.test(next)) {
          name += next;
          index += 1;
        } else break;
      }
      classes.push(name);
      continue;
    }
    index += 1;
  }

  return classes;
};

const isDead = (selector: string, shipped: string): boolean => {
  const classes = requiredClassesOf(selector);
  return classes !== undefined && classes.some((name): boolean => !shipped.includes(name));
};

const isEmpty = (container: Container): boolean => container.first === undefined;

const prune = (container: Container, shipped: string): void => {
  container.each((node): void => {
    if (node.type === 'rule') {
      const rule: Rule = node;
      const alive = rule.selectors.filter((selector): boolean => !isDead(selector, shipped));
      if (alive.length === 0) rule.remove();
      else if (alive.length < rule.selectors.length) rule.selectors = alive;
      return;
    }
    if (node.type !== 'atrule') return;

    const atRule: AtRule = node;
    // Keyframes, @property and @font-face are looked up by name, not by class.
    if (atRule.nodes === undefined || !/^(layer|media|supports|container)$/.test(atRule.name))
      return;
    prune(atRule, shipped);
    if (isEmpty(atRule)) atRule.remove();
  });
};

export const pruneUnusedCss = (css: string, shipped: string): string => {
  const root = postcss.parse(css);
  prune(root, shipped);
  return root.toString();
};
