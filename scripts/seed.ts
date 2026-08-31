// One-shot upload of the repo's photos to the o2switch image host. From then on
// the photos live on the server and the API's upload route takes over; kept in
// the repo to document (and replay) how the initial set was built. Each file is
// renamed by a fingerprint of its own content (recette.a1b2c3d4.webp), so a
// year-long cache never serves a stale version. The manifest tells the site
// which photos exist and under what name.
//
// Usage: pnpm seed-images [--dry-run]
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ASSETS } from './lib/paths.ts';

const SOURCE = join(ASSETS, 'images');
const KINDS = ['recipe', 'food'] as const;
const SSH = process.platform === 'win32'
  ? join(process.env.WINDIR ?? 'C:/Windows', 'System32', 'OpenSSH', 'ssh.exe')
  : 'ssh';
const SSH_KEY = join(homedir(), '.ssh', 'o2switch_menu');
const SSH_HOST = 'luzi6802@bouclier.o2switch.net';
const REMOTE_ROOT = '~/images.menuuu.duckdns.org';

// Eight hex chars: collision-proof in practice over a few hundred files without
// bloating the URLs.
const HASH_LENGTH = 8;

/** The content fingerprint that goes into a file's cached name. */
export const fingerprint = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, HASH_LENGTH);

const push = (staging: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-C', staging, '-cf', '-', '.']);
    const remote = spawn(SSH, [
      '-i', SSH_KEY, '-o', 'BatchMode=yes', SSH_HOST,
      `tar -x -C ${REMOTE_ROOT} && ls ${REMOTE_ROOT}/recipe | wc -l`,
    ]);
    tar.stdout.pipe(remote.stdin);
    let out = '';
    let err = '';
    remote.stdout.on('data', (chunk) => (out += chunk));
    remote.stderr.on('data', (chunk) => (err += chunk));
    remote.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err.trim()))));
    tar.on('error', reject);
    remote.on('error', reject);
  });

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  if (!existsSync(SOURCE)) throw new Error(`Introuvable : ${SOURCE}`);

  const staging = mkdtempSync(join(tmpdir(), 'menu-images-'));
  const manifest: Record<string, unknown> = { version: 1 };
  let totalBytes = 0;

  try {
    for (const kind of KINDS) {
      const entries: Record<string, string> = {};
      mkdirSync(join(staging, kind), { recursive: true });

      const dir = join(SOURCE, kind);
      const photos = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.webp')).sort() : [];
      for (const photo of photos) {
        const stem = photo.slice(0, -'.webp'.length);
        const source = join(dir, photo);
        const name = `${stem}.${fingerprint(readFileSync(source))}.webp`;
        copyFileSync(source, join(staging, kind, name));
        entries[stem] = name;
        totalBytes += statSync(source).size;
      }

      manifest[kind] = entries;
      console.log(`${kind.padEnd(8)} : ${Object.keys(entries).length} photos`);
    }

    writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(`total    : ${(totalBytes / 1024 / 1024).toFixed(1)} Mo`);

    if (dryRun) {
      console.log(`\n--dry-run : rien envoye. Prepare dans ${staging}`);
      return;
    }

    console.log('\nenvoi...');
    const recipes = await push(staging);
    console.log(`recettes sur le serveur : ${recipes}`);
  } finally {
    if (!dryRun) rmSync(staging, { recursive: true, force: true, maxRetries: 20, retryDelay: 50 });
  }
};

if (process.argv[1]?.endsWith('seed.ts')) await main();
