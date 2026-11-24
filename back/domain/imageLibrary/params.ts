import { IsIn, Matches } from 'class-validator';
import { IMAGE_ID, KINDS, type Kind } from './kinds';

/** Where a photograph goes: the name becomes a path on disk, so both parts are checked. */
export class ImageParams {
  @IsIn(KINDS, { message: `Unknown kind. Expected one of: ${KINDS.join(', ')}.` })
  kind!: Kind;

  @Matches(IMAGE_ID, { message: 'An identifier is a letter followed by letters or digits.' })
  id!: string;
}
