export type WorkflowNode = { inputs: Record<string, unknown> };
export type Workflow = Record<string, WorkflowNode>;

const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (text: string): number => {
  let crc = 0xffffffff;
  for (const byte of new TextEncoder().encode(text)) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

// A stable seed from the subject, so a reworded prompt gives a new image and a
// re-run of the same one reproduces it. crc32 (not a random hash) is stable.
export const seedFor = (id: string, subject: string): number =>
  crc32(`${id}|${subject}`) % 2_147_483_647;

// A copy of the ComfyUI template with the prompt, negative, size and seed filled in.
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
