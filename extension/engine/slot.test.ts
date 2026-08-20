import { describe, expect, it } from 'vitest';
import { DeliverySlot } from '../carrefour/type';
import { chooseSlot, SlotWindow } from './slot';

// Friday 21 August 2026 is a Friday, so weekday 5.
const slot = (begin: string, overrides: Partial<DeliverySlot> = {}): DeliverySlot => ({
  ref: begin,
  begin,
  end: begin,
  available: true,
  selected: false,
  ...overrides,
});

const SATURDAY_MORNING: SlotWindow = { weekday: 6, startMinute: 8 * 60, endMinute: 12 * 60 };
const NOW = new Date('2026-08-20T09:00:00+02:00');

describe('picking a delivery slot', () => {
  it('takes the earliest slot inside an acceptable window', () => {
    const chosen = chooseSlot(
      [
        slot('2026-08-22T14:00:00+02:00'),
        slot('2026-08-22T09:00:00+02:00'),
        slot('2026-08-22T11:00:00+02:00'),
      ],
      [SATURDAY_MORNING],
      NOW,
    );

    expect(chosen?.begin).toBe('2026-08-22T09:00:00+02:00');
  });

  it('ignores a slot on the right day but outside the hours', () => {
    const chosen = chooseSlot([slot('2026-08-22T19:00:00+02:00')], [SATURDAY_MORNING], NOW);

    expect(chosen).toBeUndefined();
  });

  it('ignores the right hours on the wrong day', () => {
    const chosen = chooseSlot([slot('2026-08-21T09:00:00+02:00')], [SATURDAY_MORNING], NOW);

    expect(chosen).toBeUndefined();
  });

  it('never takes one the shop marks unavailable', () => {
    const chosen = chooseSlot(
      [slot('2026-08-22T09:00:00+02:00', { available: false })],
      [SATURDAY_MORNING],
      NOW,
    );

    expect(chosen).toBeUndefined();
  });

  it('refuses a slot whose cutoff has already passed', () => {
    const chosen = chooseSlot(
      [slot('2026-08-22T09:00:00+02:00', { cutoff: '2026-08-20T08:00:00+02:00' })],
      [SATURDAY_MORNING],
      NOW,
    );

    expect(chosen).toBeUndefined();
  });

  it('keeps one whose cutoff is still ahead', () => {
    const chosen = chooseSlot(
      [slot('2026-08-22T09:00:00+02:00', { cutoff: '2026-08-21T14:00:00+02:00' })],
      [SATURDAY_MORNING],
      NOW,
    );

    expect(chosen).toBeDefined();
  });

  it('books nothing at all when no window was set', () => {
    const chosen = chooseSlot([slot('2026-08-22T09:00:00+02:00')], [], NOW);

    expect(chosen).toBeUndefined();
  });
});
