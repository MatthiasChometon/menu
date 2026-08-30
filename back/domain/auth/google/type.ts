export type GoogleTokens = {
  access_token: string;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  /** Whether Google itself vouches for the address, and not merely that
   *  somebody typed it into a profile. */
  email_verified?: boolean;
  name?: string;
};
