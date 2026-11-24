import { createHash } from 'node:crypto';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import type { Kind } from './kinds';

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
    const filePath = join(this.root, kind, name);
    // A file already here may be the one the manifest serves (the same photograph
    // sent again): a failed record must not take it away.
    const alreadyThere = await stat(filePath).then(
      (): boolean => true,
      (): boolean => false,
    );
    await writeFile(filePath, photo);

    let replaced: string | undefined;
    try {
      replaced = await this.record(kind, id, name);
    } catch (error: unknown) {
      // Not in the manifest, so nothing would ever serve or clean it up.
      await rm(filePath, { force: true });
      throw error;
    }
    // The photograph this one replaces is no longer listed: leaving it would
    // fill the disk with files nothing points at.
    if (replaced !== undefined && replaced !== name) {
      await rm(join(this.root, kind, replaced), { force: true });
    }

    return name;
  }

  private record(kind: Kind, id: string, name: string): Promise<string | undefined> {
    const next = this.queue.then(async (): Promise<string | undefined> => {
      const path = join(this.root, MANIFEST);
      const manifest = JSON.parse(await readFile(path, 'utf8')) as Manifest;

      const previous = manifest[kind]?.[id];
      manifest[kind] = { ...(manifest[kind] ?? {}), [id]: name };

      // Written beside and moved into place: a reader fetching the manifest
      // mid-write would otherwise get half a file, and the site would lose every
      // photograph at once.
      const staging = `${path}.${process.pid}.tmp`;
      await writeFile(staging, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      await rename(staging, path);

      return previous;
    });

    // The queue must survive a failure, or one bad upload jams every later one.
    this.queue = next.catch((): void => undefined);
    return next;
  }
}
