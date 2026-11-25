import { describe, expect, it } from 'vitest';

const base = { isSignedIn: true, failed: false, isDirty: false, savedAt: undefined };

describe('the save state under the save button', () => {
  it('says nothing to save for a signed-in reader with an untouched week', () => {
    expect(saveStateOf(base)).toBe('nothing');
  });

  it('says saved once a save went through and nothing changed since', () => {
    expect(saveStateOf({ ...base, savedAt: '2026-09-07T10:00:00Z' })).toBe('saved');
  });

  it('says pending when the week changed, even after an earlier save', () => {
    expect(saveStateOf({ ...base, isDirty: true, savedAt: '2026-09-07T10:00:00Z' })).toBe(
      'pending',
    );
  });

  it('says failed over pending, because the pending changes are what failed', () => {
    expect(saveStateOf({ ...base, failed: true, isDirty: true })).toBe('failed');
  });

  it('says signed out over everything else', () => {
    expect(
      saveStateOf({ isSignedIn: false, failed: true, isDirty: true, savedAt: '2026-09-07' }),
    ).toBe('signedOut');
  });
});
