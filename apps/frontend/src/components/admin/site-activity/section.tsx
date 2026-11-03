import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** A card of the site activity, over both columns when wide. */
export function Section({ title, hint, wide, children }: { title: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <Card className={wide ? "lg:col-span-2" : undefined}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {hint && <CardDescription>{hint}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** The two columns of cards of a tab. */
export function SectionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>;
}
