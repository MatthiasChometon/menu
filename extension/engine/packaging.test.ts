import { describe, expect, it } from 'vitest';
import { contentOf } from './packaging';

// Every one of these is a real packaging line read off the shop while
// resolving the product reference.
describe('reading how much a unit holds', () => {
  it.each([
    ['la boite de 500g', 500],
    ['le paquet de 500g', 500],
    ['le sachet de 500 g', 500],
    ['la bouteille de 50cL', 500],
    ["la bouteille d'1L", 1000],
    ['la bouteille 1L', 1000],
    ['le pot de 350 g', 350],
    ['le filet de 1,5kg', 1500],
    ['la tablette de 100g', 100],
  ])('reads %s as %i', (packaging, expected) => {
    expect(contentOf(packaging)).toBe(expected);
  });

  it('multiplies a pack by how many it holds', () => {
    expect(contentOf('les 3 boites de 400g')).toBe(1200);
  });

  it('multiplies a tray by how many portions it holds', () => {
    expect(contentOf('la barquette de 6 de 100g')).toBe(600);
  });

  it('says nothing when the line counts pieces rather than weight', () => {
    expect(contentOf('la boite de 6')).toBeUndefined();
    expect(contentOf('la barquette de 4 fruits')).toBeUndefined();
    expect(contentOf('la botte')).toBeUndefined();
  });

  it('says nothing rather than guessing at an empty line', () => {
    expect(contentOf('')).toBeUndefined();
  });
});
