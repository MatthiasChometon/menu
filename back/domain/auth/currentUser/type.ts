export type SessionPayload = {
  /** The account's session counter at signing time. A reset bumps it, which is
   *  what makes every token signed before then stop working. Absent on tokens
   *  signed before this existed, which read as version zero. */
  ver?: number;
  sub: string;
};
