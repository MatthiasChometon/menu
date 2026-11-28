type AddIcon = (name: string, data: unknown) => unknown;
type InitIcons = (addIcon: AddIcon) => void;

// The generated icon bundle, as the server build hands it over (see
// plugins/iconBundle.server.ts). It stays out of the browser build, which loads
// its own copy on demand.
let registered: InitIcons | undefined;

export const provideServerIconBundle = (init: InitIcons): void => {
  registered = init;
};

export const initServerIconBundle = (addIcon: AddIcon): void => {
  registered?.(addIcon);
};
