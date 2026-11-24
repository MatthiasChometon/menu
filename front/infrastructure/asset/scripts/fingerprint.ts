// Eight hex chars of the content's sha256: collision-proof in practice over a
// few hundred files, and short enough not to bloat the URLs. It goes into a
// file's cached name, so an edited photo gets a new one. Uses Web Crypto so the
// util stays free of Node built-ins.
export const fingerprint = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(digest)]
    .map((byte): string => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8);
};
