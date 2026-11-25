import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastAdd = vi.hoisted(() => vi.fn());
const reportError = vi.hoisted(() => vi.fn());
mockNuxtImport('useToast', () => (): object => ({ add: toastAdd }));
mockNuxtImport('useErrorReporting', () => (): object => ({ reportError }));

const LIST = { groups: [], seasonings: [] };

const withNavigator = (parts: { share?: unknown; writeText?: unknown }): void => {
  vi.stubGlobal('navigator', {
    share: parts.share,
    clipboard: { writeText: parts.writeText },
  });
};

beforeEach((): void => {
  toastAdd.mockReset();
  reportError.mockReset();
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('useShoppingShare', () => {
  it('copies the list and says so where the platform cannot share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withNavigator({ writeText });
    const { shareList } = useShoppingShare();

    await shareList(LIST);

    expect(writeText).toHaveBeenCalledOnce();
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }));
  });

  it('tells the reader, reports it and can be used again when the clipboard refuses', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValue(undefined);
    withNavigator({ writeText });
    const { shareList, isSharing } = useShoppingShare();

    await shareList(LIST);

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }));
    expect(reportError).toHaveBeenCalledOnce();
    expect(isSharing.value).toBe(false);

    await shareList(LIST);
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it('stays quiet when the reader closes the share sheet', async () => {
    withNavigator({ share: vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')) });
    const { shareList } = useShoppingShare();

    await shareList(LIST);

    expect(toastAdd).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports a share that failed for another reason', async () => {
    withNavigator({ share: vi.fn().mockRejectedValue(new Error('boom')) });
    const { shareList } = useShoppingShare();

    await shareList(LIST);

    expect(reportError).toHaveBeenCalledOnce();
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }));
  });
});
