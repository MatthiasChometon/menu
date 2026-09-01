export default defineAppConfig({
  ui: {
    colors: {
      primary: 'forest',
      neutral: 'sage',
      // In the target → forest (same as primary, a green brand owns its green);
      // near / off the target → turmeric, the warm signal.
      success: 'forest',
      warning: 'turmeric',
    },
  },
});
