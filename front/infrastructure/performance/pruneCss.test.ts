import { describe, expect, it } from 'vitest';
import { pruneUnusedCss, requiredClassesOf } from './pruneCss';

const BS = String.fromCharCode(92);

describe('requiredClassesOf', () => {
  it('reads the classes a selector needs, unescaped', () => {
    const selector = `.group${BS}/switch:active .data-${BS}[state${BS}=checked${BS}]${BS}:x`;

    expect(requiredClassesOf(selector)).toEqual(['group/switch', 'data-[state=checked]:x']);
  });

  it('ignores the classes inside :not() and :where()', () => {
    expect(requiredClassesOf('.a:not(.b) :where(.c) .d')).toEqual(['a', 'd']);
  });

  it('gives up on a hex escape rather than guess', () => {
    expect(requiredClassesOf(`.${BS}32xl${BS}:p`)).toBeUndefined();
  });
});

describe('pruneUnusedCss', () => {
  const css = '@layer utilities{.used{a:b}.dead{c:d}.used,.dead{e:f}}@layer base{.dead{g:h}}';

  it('drops the rules naming a class the site never ships', () => {
    expect(pruneUnusedCss(css, 'class="used"')).toBe('@layer utilities{.used{a:b}.used{e:f}}');
  });

  it('keeps a rule whose classes are all shipped', () => {
    expect(pruneUnusedCss('.a .b{x:y}', 'a b')).toBe('.a .b{x:y}');
  });

  it('keeps keyframes and @property, looked up by name', () => {
    const kept = '@keyframes spin{to{x:y}}@property --a{syntax:"*"}';

    expect(pruneUnusedCss(kept, '')).toBe(kept);
  });

  it('leaves a rule without a class alone', () => {
    expect(pruneUnusedCss('[role=button]{x:y}', '')).toBe('[role=button]{x:y}');
  });
});
