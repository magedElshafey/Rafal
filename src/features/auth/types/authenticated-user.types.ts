export type AuthenticatedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  profileComplete: boolean;
  createdAt: string;
};
