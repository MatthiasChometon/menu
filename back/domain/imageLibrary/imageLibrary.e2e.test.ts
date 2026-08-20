import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const ADMIN = 'matthias@example.com';
const READER = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const ROOT = join(tmpdir(), 'menu-images-e2e');

// A real photograph, wider than the site keeps: it is the resizing that has to
// be proved, and a small image would pass whether or not it happens.
const photograph = (): Promise<Buffer> =>
  sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 120, g: 180, b: 40 } },
  })
    .jpeg()
    .toBuffer();

const manifest = async (): Promise<Record<string, Record<string, string>>> =>
  JSON.parse(await readFile(join(ROOT, 'manifest.json'), 'utf8')) as Record<
    string,
    Record<string, string>
  >;

let api: TestApp;

// Windows keeps a handle on a file for a moment after it is written, so a plain
// removal between two tests trips on EBUSY. The retries are the fix Node offers.
const emptyTheFolder = (): Promise<void> =>
  rm(ROOT, { recursive: true, force: true, maxRetries: 20, retryDelay: 50 });

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
  await emptyTheFolder();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
  await emptyTheFolder();
  await mkdir(join(ROOT, 'recipe'), { recursive: true });
  await mkdir(join(ROOT, 'food'), { recursive: true });
  await writeFile(join(ROOT, 'manifest.json'), '{"version":1,"recipe":{},"food":{}}\n', 'utf8');
});

describe('adding a photograph', () => {
  it('converts whatever arrives into what the site serves', async () => {
    const admin = await api.signUp(ADMIN, PASSWORD);

    const response = await api.postFile(
      '/images/recipe/chiliChicken',
      'photo.jpg',
      await photograph(),
      admin,
    );

    expect(response.statusCode).toBe(201);
    const { file } = JSON.parse(response.body) as { file: string };

    // Named for the dish, with a hash of the CONVERTED bytes: that is what lets
    // the browser keep it for a year and still see a replacement immediately.
    expect(file).toMatch(/^chiliChicken\.[a-f0-9]{8}\.webp$/);

    // Read the bytes first: handed a path, sharp keeps the file open in its own
    // cache and Windows then refuses to delete it between tests.
    const written = await sharp(await readFile(join(ROOT, 'recipe', file))).metadata();
    expect(written.format).toBe('webp');
    // A phone photograph is three thousand pixels wide; serving that would undo
    // the reason the images moved out in the first place.
    expect(written.width).toBe(800);
  });

  it('records it where the site looks for it', async () => {
    const admin = await api.signUp(ADMIN, PASSWORD);

    const response = await api.postFile(
      '/images/food/brownRice',
      'photo.jpg',
      await photograph(),
      admin,
    );
    const { file } = JSON.parse(response.body) as { file: string };

    // Without this line the file exists and the site never shows it: the
    // manifest is the only thing that maps a dish to a filename.
    expect((await manifest()).food?.brownRice).toBe(file);
  });

  it('keeps the manifest whole when two arrive together', async () => {
    const admin = await api.signUp(ADMIN, PASSWORD);
    const bytes = await photograph();

    await Promise.all([
      api.postFile('/images/recipe/first', 'a.jpg', bytes, admin),
      api.postFile('/images/recipe/second', 'b.jpg', bytes, admin),
    ]);

    // Read, change, write back — done twice at once, the second erases the
    // first, and a photograph arrives and then quietly disappears.
    const recorded = (await manifest()).recipe ?? {};
    expect(Object.keys(recorded).sort()).toEqual(['first', 'second']);
  });
});

describe('who may add one', () => {
  it('turns away an account that is not an administrator', async () => {
    const reader = await api.signUp(READER, PASSWORD);

    const response = await api.postFile(
      '/images/recipe/chiliChicken',
      'photo.jpg',
      await photograph(),
      reader,
    );

    // Photographs are the site's own content, published under its name. Letting
    // any signed-in account write files onto shared hosting is a different
    // proposition entirely.
    expect(response.statusCode).toBe(403);
  });

  it('turns away nobody at all', async () => {
    const response = await api.postFile(
      '/images/recipe/chiliChicken',
      'photo.jpg',
      await photograph(),
    );

    expect(response.statusCode).toBe(401);
  });
});

describe('what it refuses', () => {
  it('refuses a folder it does not serve', async () => {
    const admin = await api.signUp(ADMIN, PASSWORD);

    const response = await api.postFile(
      '/images/../../etc/passwd',
      'photo.jpg',
      await photograph(),
      admin,
    );

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('refuses an identifier that could escape the folder', async () => {
    const admin = await api.signUp(ADMIN, PASSWORD);

    const response = await api.postFile(
      '/images/recipe/..%2F..%2Fmanifest',
      'photo.jpg',
      await photograph(),
      admin,
    );

    // The name becomes a path on disk. Anything not shaped like an identifier
    // has to be refused before it gets there.
    expect(response.statusCode).toBe(400);
    await expect(stat(join(ROOT, 'manifest.json'))).resolves.toBeDefined();
  });

  it('refuses something that is not an image at all', async () => {
    const admin = await api.signUp(ADMIN, PASSWORD);

    const response = await api.postFile(
      '/images/recipe/chiliChicken',
      'notes.txt',
      Buffer.from('this is not a photograph'),
      admin,
    );

    expect(response.statusCode).toBe(400);
  });
});
