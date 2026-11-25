export type SaveStateInput = {
  isSignedIn: boolean;
  failed: boolean;
  isDirty: boolean;
  savedAt: string | undefined;
};

// What the line under the save button says. One answer at a time, the most
// useful first: not being signed in explains everything else, a failure beats
// "unsaved changes" because those changes are exactly what failed, and only a
// week with nothing pending can be called saved.
export const saveStateOf = ({
  isSignedIn,
  failed,
  isDirty,
  savedAt,
}: SaveStateInput): SaveState => {
  if (!isSignedIn) return 'signedOut';
  if (failed) return 'failed';
  if (isDirty) return 'pending';

  return savedAt === undefined ? 'nothing' : 'saved';
};
