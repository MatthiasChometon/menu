import { createHash } from 'node:crypto';
import { rename, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

export const KINDS = ['recipe', 'food'] as const;
export type Kind = (typeof KINDS)[number];

/** The identifiers the site content uses. The API cannot check a dish exists —
 *  the catalogue is content, not a table — but it can refuse anything that is
 *  not shaped like an identifier, which keeps junk out of the folder. */
const ID = /^[A-Za-z][A-Za-z0-9]{0,63}$/;

// What the cards actually display. A photograph off a phone is three thousand
// pixels wide and four megabytes; served as-is it would undo the whole point of
// moving the images out.
const MAX_WIDTH = 800;
const QUALITY = 78;

const MANIFEST = 'manifest.json';

type Manifest = { version?: number } & Partial<Record<Kind, Record<string, string>>>;

@Injectable()
export class ImageLibraryService {
  // Two uploads landing together would each read the manifest, add their own
  // entry and write it back — and the second would erase the first. Serialising
  // the read-modify-write is what stops a photograph arriving and vanishing.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: ConfigService) {}

  private get root(): string {
    return this.config.getOrThrow<string>('IMAGES_ROOT');
  }

  assertKind(kind: string): asserts kind is Kind {
    if (!KINDS.includes(kind as Kind)) {
      throw new BadRequestException(`Unknown kind. Expected one of: ${KINDS.join(', ')}.`);
    }
  }

  assertId(id: string): void {
    if (!ID.test(id)) {
      throw new BadRequestException('An identifier is a letter followed by letters or digits.');
    }
  }

  /** Converts whatever arrived into the site's own format, files it under a name
   *  carrying a hash of the result, and records it. Returns the filename. */
  async store(kind: Kind, id: string, incoming: Buffer): Promise<string> {
    let photo: Buffer;
    try {
      photo = await sharp(incoming)
        // Phones store the orientation beside the pixels; without this a photo
        // taken in portrait arrives on its side.
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException('That file is not an image this server can read.');
    }

    // The hash is of the CONVERTED bytes, not of what was uploaded: the name has
    // to change when the served photograph changes, and two different originals
    // can convert to the same picture.
    const name = `${id}.${createHash('sha256').update(photo).digest('hex').slice(0, 8)}.webp`;
    await writeFile(join(this.root, kind, name), photo);
    await this.record(kind, id, name);

    return name;
  }

  private record(kind: Kind, id: string, name: string): Promise<void> {
    const next = this.queue.then(async (): Promise<void> => {
      const path = join(this.root, MANIFEST);
      const manifest = JSON.parse(await readFile(path, 'utf8')) as Manifest;

      manifest[kind] = { ...(manifest[kind] ?? {}), [id]: name };

      // Written beside and moved into place: a reader fetching the manifest
      // mid-write would otherwise get half a file, and the site would lose every
      // photograph at once.
      const staging = `${path}.${process.pid}.tmp`;
      await writeFile(staging, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      await rename(staging, path);
    });

    // The queue must survive a failure, or one bad upload jams every later one.
    this.queue = next.catch((): void => undefined);
    return next;
  }
}
