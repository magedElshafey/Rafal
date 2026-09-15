import type { AuthenticatedUser } from "@/features/auth/types/authenticated-user.types";

type AccountUserSummaryProps = {
  user: AuthenticatedUser;
};

export function AccountUserSummary({ user }: AccountUserSummaryProps) {
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <span className="flex min-w-0 items-center gap-3 px-5 py-4">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-500 bg-gold-50 type-ui-sm font-bold text-gold-700"
      >
        {user.firstName.slice(0, 1)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate type-body font-bold text-gray-1000">
          {fullName}
        </span>
        <span className="truncate type-caption text-gray-400" dir="ltr">
          {user.email}
        </span>
      </span>
    </span>
  );
}
