export const KINDS = ['recipe', 'food'] as const;
export type Kind = (typeof KINDS)[number];

/** The identifiers the site content uses. The API cannot check a dish exists -
 *  the catalogue is content, not a table - but it can refuse anything that is
 *  not shaped like an identifier, which keeps junk out of the folder. */
export const IMAGE_ID = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
