import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: ReactNode;
  description?: ReactNode;
  destructive?: boolean;
  children: ReactNode;
}

export function SettingsSection({ title, description, destructive, children }: SettingsSectionProps) {
  return (
    <Card className={cn(destructive && "ring-destructive/30")}>
      <CardHeader>
        <CardTitle className={cn(destructive && "text-destructive")}>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
