import { afterEach, describe, expect, it, vi } from 'vitest';

const canvasCapturing = (blob: Blob | null): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'toBlob', {
    value: (callback: BlobCallback): void => callback(blob),
    configurable: true,
  });

  return canvas;
};

const withShare = (share: () => Promise<void>): void => {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: (): boolean => true, configurable: true });
};

afterEach((): void => {
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

describe('useCardCanvas', () => {
  it('raises when the card cannot be captured instead of doing nothing', async () => {
    const { downloadOrFail } = useCardCanvas();

    await expect(downloadOrFail(canvasCapturing(null), 'card.png')).rejects.toThrow(
      'could not be turned into an image',
    );
  });

  it('raises when the card cannot be captured to share', async () => {
    withShare(() => Promise.resolve());
    const { shareOrFail } = useCardCanvas();

    await expect(shareOrFail(canvasCapturing(null), 'card.png')).rejects.toThrow(
      'could not be turned into an image',
    );
  });

  it('reads a reader closing the share sheet as a change of mind, not a failure', async () => {
    withShare(() => Promise.reject(new DOMException('closed', 'AbortError')));
    const { shareOrFail } = useCardCanvas();

    await expect(
      shareOrFail(canvasCapturing(new Blob(['x'], { type: 'image/png' })), 'card.png'),
    ).resolves.toBe(false);
  });

  it('raises when the share itself fails', async () => {
    withShare(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    const { shareOrFail } = useCardCanvas();

    await expect(
      shareOrFail(canvasCapturing(new Blob(['x'], { type: 'image/png' })), 'card.png'),
    ).rejects.toThrow('no');
  });

  it('shares the card when everything works', async () => {
    const share = vi.fn(() => Promise.resolve());
    withShare(share);
    const { shareOrFail } = useCardCanvas();

    await expect(
      shareOrFail(canvasCapturing(new Blob(['x'], { type: 'image/png' })), 'card.png'),
    ).resolves.toBe(true);
    expect(share).toHaveBeenCalledOnce();
  });
});
