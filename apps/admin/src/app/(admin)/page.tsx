import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kilotrace/ui/components/card";
import type { Metadata } from "next";
import { ROLE_LABELS } from "@/config/roles";
import { getAdminMe } from "@/lib/api/server";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const me = await getAdminMe();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      {me && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{me.email}</CardTitle>
            <CardDescription>{ROLE_LABELS[me.role]}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
