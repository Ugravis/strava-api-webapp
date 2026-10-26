import type { Metadata } from "next";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kilotrace/ui/components/card";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kilotrace · Administration</CardTitle>
          <CardDescription>La connexion au back-office arrive prochainement.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
