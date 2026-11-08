import { createVersion } from "@/lib/admin/version";

/** The version of the accounts: the `refreshKey` of their table and of their detail. */
export const { useVersion: useUsersVersion, bump: bumpUsers } = createVersion();
