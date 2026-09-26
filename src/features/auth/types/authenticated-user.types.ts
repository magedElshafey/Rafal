export type AuthenticatedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profileComplete: boolean;
  createdAt: string;
};
