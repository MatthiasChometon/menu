// The row as stored, password hash included. It never leaves the repository:
// public methods map to the User model instead.
export type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  googleId: string | null;
  createdAt: Date;
};
