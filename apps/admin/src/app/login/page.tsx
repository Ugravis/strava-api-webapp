import { buttonVariants } from "@kilotrace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kilotrace/ui/components/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  not_allowed: "Ce compte Google n'a pas accès au back-office.",
  google: "La connexion avec Google a échoué. Réessayez.",
  google_disabled: "La connexion avec Google n'est pas configurée sur ce serveur.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kilotrace · Administration</CardTitle>
          <CardDescription>Réservé aux comptes autorisés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          {/* A full navigation: the API redirects to Google. */}
          <a href="/api/admin/auth/google" className={buttonVariants({ className: "w-full" })}>
            Se connecter avec Google
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
