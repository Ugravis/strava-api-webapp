import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/card";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  /** Anchor of the section, to link to it. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  destructive?: boolean;
  children: ReactNode;
}

export function SettingsSection({ id, title, description, destructive, children }: SettingsSectionProps) {
  return (
    <Card id={id} className={cn("scroll-mt-20", destructive && "ring-destructive/30")}>
      <CardHeader>
        <CardTitle className={cn(destructive && "text-destructive")}>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
