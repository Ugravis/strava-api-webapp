import { AdminRole } from "@kilotrace/shared/admin";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminRole } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";

export default async function AdminDashboardPage() {
  const roles = await requireAdminRole(AdminRole.Support);
  const t = getAdminTranslations("dashboard");
  const roleLabel = getAdminTranslations("roles");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("roles")}</CardTitle>
            <CardDescription>{t("rolesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="secondary">
                {roleLabel(role)}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("sections")}</CardTitle>
            <CardDescription>{t("sectionsEmpty")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
