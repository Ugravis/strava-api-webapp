"use client";

import { SidebarMenuButton } from "@kilotrace/ui/components/sidebar";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { routes } from "@/config/routes";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const signOut = () =>
    startTransition(async () => {
      await fetch("/api/admin/auth/sign-out", { method: "POST" });
      router.replace(routes.login);
      router.refresh();
    });

  return (
    <SidebarMenuButton onClick={signOut} disabled={pending} tooltip="Se déconnecter">
      <LogOut />
      <span>Se déconnecter</span>
    </SidebarMenuButton>
  );
}
