import { renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import WeekLoadFailed from './WeekLoadFailed.vue';

describe('WeekLoadFailed', () => {
  it('announces the failure as an alert', async () => {
    await renderSuspended(WeekLoadFailed);

    expect(screen.getByRole('alert').textContent).toContain('Impossible de charger ta semaine');
  });

  it('asks to fetch the week again when the reader presses retry', async () => {
    const { emitted } = await renderSuspended(WeekLoadFailed);

    await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(emitted().retry).toHaveLength(1);
  });
});
