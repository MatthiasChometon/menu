import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import {
  FALLBACK_WIDTH,
  IMAGE_WIDTHS,
  localPath,
  stemOf,
  type LocalImages,
  type LocalKind,
} from '../utils/localImages';

// Before `nuxt generate`: downloads every photograph the image host lists and writes AVIF and WebP
// variants in several widths under public/img, so the generated site serves its pictures itself.
// Files are named after the photograph's content hash (`stem`), so one that exists is current and is
// not redone (the table of sizes beside them says which are done). Host unreachable: nothing is written and the build falls back to the host's own URLs.
const HOST = (process.env.NUXT_PUBLIC_IMAGES_BASE ?? 'https://images.menu.mtxlab.xyz').replace(
  /\/+$/,
  '',
);
const KINDS: LocalKind[] = ['recipe', 'food', 'equipment'];
const CONCURRENCY = 4;
const OUT_DIR = 'public';
const TABLE_FILE = `${OUT_DIR}/img/images.json`;
const MISSING_FILE = `${OUT_DIR}/img/missing.json`;

type Job = { kind: LocalKind; file: string };

const writeAtomically = (file: string, content: Buffer | string): void => {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
};

const fetchBytes = async (url: string): Promise<Buffer | undefined> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  // Listed by the manifest but absent from the host: the site shows its pictogram, as it does today.
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`${url}: ${response.status}`);

  return Buffer.from(await response.arrayBuffer());
};

const localize = async ({ kind, file }: Job): Promise<[number, number] | undefined> => {
  const stem = stemOf(file);
  const bytes = await fetchBytes(`${HOST}/${kind}/${file}`);
  if (bytes === undefined) {
    process.stderr.write(`localizeImages: ${kind}/${file} is 404 on the host, left out
`);

    return undefined;
  }
  const source = sharp(bytes);
  const { width = 0, height = 0 } = await source.metadata();

  for (const target of IMAGE_WIDTHS[kind].filter((candidate): boolean => candidate <= width)) {
    const resized = source.clone().resize({ width: target });
    writeAtomically(
      `${OUT_DIR}${localPath(kind, stem, target, 'avif')}`,
      await resized.clone().avif({ quality: 45, effort: 4 }).toBuffer(),
    );
    writeAtomically(
      `${OUT_DIR}${localPath(kind, stem, target, 'webp')}`,
      await resized.webp({ quality: 70 }).toBuffer(),
    );
  }

  return [width, height];
};

const manifestJobs = async (): Promise<Job[]> => {
  const manifest = (await (await fetch(`${HOST}/manifest.json`)).json()) as Partial<
    Record<LocalKind, Record<string, string>>
  >;

  return KINDS.flatMap((kind): Job[] =>
    Object.values(manifest[kind] ?? {}).map((file): Job => ({ kind, file })),
  );
};

const main = async (): Promise<void> => {
  const jobs = await manifestJobs().catch((failure: unknown): Job[] => {
    process.stderr.write(
      `localizeImages: host manifest unreadable (${String(failure)}), skipped\n`,
    );

    return [];
  });
  const previous = existsSync(TABLE_FILE)
    ? (JSON.parse(readFileSync(TABLE_FILE, 'utf8')) as LocalImages)
    : {};
  const table: LocalImages = {};
  const queue = [...jobs];

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async (): Promise<void> => {
      for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
        const stem = stemOf(job.file);
        const done = previous[job.kind]?.[stem];
        const isDone =
          done !== undefined &&
          existsSync(`${OUT_DIR}${localPath(job.kind, stem, FALLBACK_WIDTH[job.kind], 'avif')}`);
        const size = isDone ? done : await localize(job);
        if (size !== undefined) (table[job.kind] ??= {})[stem] = size;
      }
    }),
  );
  if (jobs.length > 0) {
    writeAtomically(TABLE_FILE, `${JSON.stringify(table)}\n`);
    const missing = jobs
      .filter((job): boolean => table[job.kind]?.[stemOf(job.file)] === undefined)
      .map((job): string => `${job.kind}/${job.file}`);
    writeAtomically(MISSING_FILE, `${JSON.stringify(missing)}\n`);
  }
  process.stdout.write(`localizeImages: ${jobs.length} photographs served from the site itself\n`);
};

main().catch((failure: unknown): void => {
  process.stderr.write(`localizeImages failed: ${String(failure)}\n`);
  process.exit(1);
});
