import { Measurements } from '../profile/type';

/** A member as stored: their name and their answers, without the derived targets. */
export type MemberRecord = Measurements & { id: string; name: string };
