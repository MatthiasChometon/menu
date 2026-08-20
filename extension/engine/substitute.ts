import { SearchHit, ShopClient } from '../carrefour/type';
import { contentOf } from './packaging';
import { PlannedLine } from './type';

export type Substitution = {
  ean: string;
  title: string;
  /** Usable content of one unit, when the shop states it plainly. */
  size: number;
};

const normalise = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Words too common to tell two products apart. Dropping them keeps "riz complet"
// demanding both words while "le riz" demands only the one that matters.
const NOISE = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'au', 'aux', 'et', 'en', 'a']);

const meaningfulWords = (text: string): string[] =>
  normalise(text)
    .split(' ')
    .filter((word): boolean => word.length > 2 && !NOISE.has(word));

export class Substituter {
  constructor(private readonly shop: ShopClient) {}

  async findFor(line: PlannedLine): Promise<Substitution | undefined> {
    // What is demanded comes from how the menu names the food — "Riz complet",
    // "Steak haché 5%", "Thon au naturel" — never from the usual product's
    // name. That one carries a brand and a range, and requiring "CLASSIC" of a
    // replacement would rule out every replacement there is.
    const demanded = line.label ?? line.productName;
    const searched = line.productName ?? line.label;
    if (demanded === undefined || searched === undefined) {
      return undefined;
    }

    const required = meaningfulWords(demanded);
    if (required.length === 0) {
      return undefined;
    }

    const hits = await this.shop.search(searched);

    return this.bestOf(hits, required, line.unitSize);
  }

  private bestOf(
    hits: SearchHit[],
    required: string[],
    wantedSize: number | undefined,
  ): Substitution | undefined {
    const eligible = hits
      .map((hit) => ({ hit, size: contentOf(hit.packaging) }))
      // A candidate must say everything the reference said. Anything less is a
      // different product, not a substitute.
      .filter(({ hit }): boolean => {
        const title = normalise(hit.title);

        return required.every((word): boolean => title.includes(word));
      })
      // Without a stated content there is no way to know how many to buy, and
      // guessing is how a week ends up with six litres of milk.
      .filter(
        (candidate): candidate is { hit: SearchHit; size: number } => candidate.size !== undefined,
      );

    if (eligible.length === 0) {
      return undefined;
    }

    // Closest to the format the menu was written against, so the quantities
    // stay recognisable to whoever reads the report.
    const [best] = eligible.sort(
      (left, right): number =>
        Math.abs(left.size - (wantedSize ?? left.size)) -
        Math.abs(right.size - (wantedSize ?? right.size)),
    );

    return { ean: best.hit.ean, title: best.hit.title, size: best.size };
  }
}
