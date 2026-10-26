"use client";

import { createContext, use, type ReactNode } from "react";
import type { User } from "@/lib/api/types";

const UserContext = createContext<User | null>(null);

export function UserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <UserContext value={user}>{children}</UserContext>;
}

/** Signed-in user, available in every client component of the app shell. */
export function useCurrentUser(): User {
  const user = use(UserContext);
  if (!user) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return user;
}
