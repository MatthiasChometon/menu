import { describe, expect, it } from 'vitest';
import { buildWorkflow, seedFor, type Workflow } from './workflow';

describe('seedFor', () => {
  it('is deterministic for the same id and subject', () => {
    expect(seedFor('banana', 'a banana')).toBe(seedFor('banana', 'a banana'));
  });

  it('matches the crc32 seed, so images reproduce (banana|a banana)', () => {
    expect(seedFor('banana', 'a banana')).toBe(553570855);
  });

  it('changes when the subject is reworded', () => {
    expect(seedFor('banana', 'a banana')).not.toBe(seedFor('banana', 'a ripe banana'));
  });

  it('stays within the int32 range', () => {
    const seed = seedFor('x', 'y');

    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2_147_483_647);
  });
});

describe('buildWorkflow', () => {
  const template = (): Workflow => ({
    '3': { inputs: { seed: 0 } },
    '5': { inputs: { width: 0, height: 0 } },
    '6': { inputs: { text: '' } },
    '7': { inputs: { text: '' } },
  });

  it('fills the prompt, negative, size and seed', () => {
    const workflow = buildWorkflow(template(), 'a dish', 'ugly', [1024, 640], 42);

    expect(workflow['6']!.inputs.text).toBe('a dish');
    expect(workflow['7']!.inputs.text).toBe('ugly');
    expect(workflow['5']!.inputs.width).toBe(1024);
    expect(workflow['5']!.inputs.height).toBe(640);
    expect(workflow['3']!.inputs.seed).toBe(42);
  });

  it('does not mutate the template it is given', () => {
    const source = template();
    buildWorkflow(source, 'a dish', 'ugly', [1024, 640], 42);

    expect(source['6']!.inputs.text).toBe('');
  });
});
