import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ImageLibraryController } from './controller';

describe('the photograph upload route', () => {
  it('is not cut by the global request timeout', () => {
    const handler: unknown = Reflect.get(ImageLibraryController.prototype, 'upload');

    expect(
      new Reflector().getAllAndOverride<boolean>('skipRequestTimeout', [
        handler as () => void,
        ImageLibraryController,
      ]),
    ).toBe(true);
  });
});
