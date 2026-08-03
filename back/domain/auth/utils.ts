export const credentialConstraints = (): {
  minPasswordLength: number;
  maxPasswordLength: number;
  maxNameLength: number;
} => ({
  // NIST recommends length over composition rules: no forced symbols, but a
  // real minimum.
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxNameLength: 80,
});
