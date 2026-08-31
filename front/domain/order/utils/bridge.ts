import type {
  AwaitCarrefourMessage,
  ExtensionHereMessage,
  PairMessage,
  PairedMessage,
  WhereIsExtensionMessage,
} from '../types/bridge.type';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isWhereIsExtension = (data: unknown): data is WhereIsExtensionMessage =>
  isRecord(data) && data.type === 'menu:where-is-extension';

export const isPair = (data: unknown): data is PairMessage =>
  isRecord(data) &&
  data.type === 'menu:pair' &&
  typeof data.endpoint === 'string' &&
  typeof data.token === 'string';

export const isAwaitCarrefour = (data: unknown): data is AwaitCarrefourMessage =>
  isRecord(data) && data.type === 'menu:await-carrefour' && typeof data.returnUrl === 'string';

export const isExtensionHere = (data: unknown): data is ExtensionHereMessage =>
  isRecord(data) && data.type === 'menu:extension-here' && typeof data.configured === 'boolean';

export const isPaired = (data: unknown): data is PairedMessage =>
  isRecord(data) && data.type === 'menu:paired';
