import { describe, expect, it } from 'vitest';

describe('useStepDuration', () => {
  it('reads a plain minute duration', () => {
    const { minutesOf } = useStepDuration();

    expect(minutesOf('Laisser mijoter 40 min à petits bouillons.')).toBe(40);
  });

  it('reads a duration written in full words', () => {
    const { minutesOf } = useStepDuration();

    expect(minutesOf('Enfourner pendant 20 minutes à feu doux.')).toBe(20);
  });

  it('reads an hour-and-minutes duration', () => {
    const { minutesOf } = useStepDuration();

    expect(minutesOf('Laisser cuire 1 h 30 au four.')).toBe(90);
  });

  it('reads a bare hour duration', () => {
    const { minutesOf } = useStepDuration();

    expect(minutesOf('Laisser mariner 2 h au frais.')).toBe(120);
  });

  it('reads an hour written without a space', () => {
    const { minutesOf } = useStepDuration();

    expect(minutesOf('Cuire 1h30 au four.')).toBe(90);
  });

  it('finds nothing in a step without a duration', () => {
    const { minutesOf } = useStepDuration();

    expect(minutesOf("Émincer l'oignon et le poivron.")).toBeUndefined();
  });
});
