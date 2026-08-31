// Generates the dish and ingredient photos with ComfyUI (running on :8188).
// buildWorkflow()/seedFor() are pure and tested; the rest drives ComfyUI over
// its HTTP API and writes assets/images/<recipe|food>/<id>.webp.
//
// Usage:
//   pnpm generate --only chiliChicken,banana   # a targeted try
//   pnpm generate --recipes                     # every dish
//   pnpm generate --foods                       # every ingredient
//   pnpm generate --all --force                 # regenerate everything
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { ASSETS } from '../../../lib/paths.ts';
import { readJson } from '../../../lib/content.ts';

const COMFY = 'http://127.0.0.1:8188';
const IMAGES = join(ASSETS, 'images');
const COMFY_DIR = join(dirname(fileURLToPath(import.meta.url)), 'comfy');

const RECIPE_SIZE: [number, number] = [1024, 640];
const FOOD_SIZE: [number, number] = [768, 768];
const WEBP_QUALITY = 82;

type Node = { inputs: Record<string, unknown> };
type Workflow = Record<string, Node>;
type Prompts = {
  recipeStyle: string;
  foodStyle: string;
  negative: string;
  recipes: Record<string, string>;
  foods: Record<string, string>;
};

/** A stable seed from the subject, so a reworded prompt gives a new image and a
 *  re-run of the same one reproduces it. crc32 (not a random hash) is stable. */
export const seedFor = (id: string, subject: string): number =>
  crc32(`${id}|${subject}`) % 2_147_483_647;

/** A copy of the template with the prompt, negative, size and seed filled in. */
export const buildWorkflow = (
  template: Workflow,
  prompt: string,
  negative: string,
  [width, height]: [number, number],
  seed: number,
): Workflow => {
  const workflow = structuredClone(template);
  workflow['6']!.inputs.text = prompt;
  workflow['7']!.inputs.text = negative;
  workflow['5']!.inputs.width = width;
  workflow['5']!.inputs.height = height;
  workflow['3']!.inputs.seed = seed;
  return workflow;
};

const postPrompt = async (workflow: Workflow): Promise<string> => {
  const response = await fetch(`${COMFY}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!response.ok) throw new Error(`ComfyUI /prompt: HTTP ${response.status}`);
  return ((await response.json()) as { prompt_id: string }).prompt_id;
};

type HistoryImage = { filename: string; subfolder?: string; type?: string };
type History = Record<
  string,
  { status?: { status_str?: string }; outputs?: Record<string, { images?: HistoryImage[] }> }
>;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForImage = async (promptId: string, timeoutMs = 300_000): Promise<Buffer> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const history = (await (await fetch(`${COMFY}/history/${promptId}`)).json()) as History;
    const entry = history[promptId];
    if (entry !== undefined) {
      if (entry.status?.status_str === 'error') throw new Error(`ComfyUI a echoue: ${promptId}`);
      for (const output of Object.values(entry.outputs ?? {})) {
        for (const image of output.images ?? []) {
          const query = new URLSearchParams({
            filename: image.filename,
            subfolder: image.subfolder ?? '',
            type: image.type ?? 'output',
          });
          const view = await fetch(`${COMFY}/view?${query.toString()}`);
          return Buffer.from(await view.arrayBuffer());
        }
      }
    }
    await wait(1500);
  }
  throw new Error(`Aucune image apres ${timeoutMs / 1000}s pour ${promptId}`);
};

const saveWebp = async (raw: Buffer, destination: string): Promise<void> => {
  mkdirSync(dirname(destination), { recursive: true });
  await sharp(raw).webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(destination);
};

const generateOne = async (
  kind: 'recipe' | 'food',
  id: string,
  subject: string,
  prompts: Prompts,
  template: Workflow,
  force: boolean,
): Promise<boolean> => {
  const folder = kind === 'recipe' ? 'recipe' : 'food';
  const destination = join(IMAGES, folder, `${id}.webp`);
  if (existsSync(destination) && !force) {
    console.log(`  = ${id} (deja la)`);
    return false;
  }

  const style = kind === 'recipe' ? prompts.recipeStyle : prompts.foodStyle;
  const size = kind === 'recipe' ? RECIPE_SIZE : FOOD_SIZE;
  const workflow = buildWorkflow(
    template,
    style.replace('{subject}', subject),
    prompts.negative,
    size,
    seedFor(id, subject),
  );

  const started = Date.now();
  await saveWebp(await waitForImage(await postPrompt(workflow)), destination);
  const kb = Math.round(statSync(destination).size / 1024);
  console.log(`  + ${id} (${Math.round((Date.now() - started) / 1000)}s, ${kb} Ko)`);
  return true;
};

const main = async (): Promise<number> => {
  const { values } = parseArgs({
    options: {
      recipes: { type: 'boolean', default: false },
      foods: { type: 'boolean', default: false },
      all: { type: 'boolean', default: false },
      only: { type: 'string' },
      force: { type: 'boolean', default: false },
    },
  });

  const prompts = readJson<Prompts>(join(COMFY_DIR, 'prompts.json'));
  const template = readJson<Workflow>(join(COMFY_DIR, 'food-photo.api.json'));
  const wanted = values.only ? new Set(values.only.split(',')) : undefined;

  const targets: [kind: 'recipe' | 'food', id: string, subject: string][] = [];
  for (const [kind, key] of [
    ['recipe', 'recipes'],
    ['food', 'foods'],
  ] as const) {
    const include = values.all || values.only !== undefined || (kind === 'recipe' ? values.recipes : values.foods);
    if (!include) continue;
    for (const [id, subject] of Object.entries(prompts[key])) {
      if (wanted === undefined || wanted.has(id)) targets.push([kind, id, subject]);
    }
  }

  if (targets.length === 0) {
    console.error('Rien a generer. Choisis --recipes, --foods, --all ou --only <ids>.');
    return 1;
  }

  console.log(`${targets.length} image(s) a generer\n`);
  let created = 0;
  for (const [index, [kind, id, subject]] of targets.entries()) {
    process.stdout.write(`[${index + 1}/${targets.length}] ${kind} `);
    if (await generateOne(kind, id, subject, prompts, template, values.force)) created += 1;
  }

  console.log(`\n${created} image(s) creee(s) dans ${IMAGES}`);
  return 0;
};

if (process.argv[1]?.endsWith('generate.ts')) process.exit(await main());
