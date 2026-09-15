import "server-only";

import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";

export const mockAuthenticatedUser: AuthenticatedUser = {
  id: "mock-customer-01",
  firstName: "سارة",
  lastName: "عبدالله",
  email: "sara@email.com",
};
