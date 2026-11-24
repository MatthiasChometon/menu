// Phusion Passenger runs the shared host. It defines this global in the process
// it starts, which makes it the one reliable sign of the deployed server: a
// local compose stack runs NODE_ENV=production too, with a throwaway secret and
// no guest list, and must not be held to the deployed server's checks.
declare const PhusionPassenger: unknown;

export const underPassenger = (): boolean => typeof PhusionPassenger !== 'undefined';
