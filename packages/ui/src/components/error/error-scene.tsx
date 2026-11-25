import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo, type AppVariant } from "@kilotrace/ui/components/brand/app-logo";
import { GridBackdrop } from "@kilotrace/ui/components/layout/grid-backdrop";
import { cn } from "@kilotrace/ui/lib/utils";
import { TileCode } from "./tile-code";

interface ErrorSceneProps {
  /** Digits of the status code, drawn as tiles. */
  code: string;
  /** Index of the digit drawn as tiles still to visit. */
  ghost?: number;
  variant?: AppVariant;
  /** Where the logo leads. */
  homeHref: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Buttons, the main one first. */
  actions: ReactNode;
  /** A small line under the buttons, such as the reference of the error. */
  footnote?: ReactNode;
}

/** Full-screen page of an error: the logo, the code drawn as map tiles, what happened and where to go. */
export function ErrorScene({ code, ghost, variant = "site", homeHref, eyebrow, title, description, actions, footnote }: ErrorSceneProps) {
  return (
    <div className="relative isolate flex min-h-svh flex-1 flex-col overflow-hidden">
      <GridBackdrop className="mask-[radial-gradient(65%_55%_at_50%_35%,black,transparent)]" />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/4 left-1/2 -z-10 size-80 -translate-x-1/2 rounded-full blur-3xl sm:size-120",
          variant === "admin" ? "bg-blue-500/15" : "bg-green-500/15",
        )}
      />
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center px-4">
        <Link href={homeHref} className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <AppLogo variant={variant} />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
          <TileCode code={code} ghost={ghost} variant={variant} className="max-w-72 sm:max-w-sm" />
          <p className="inline-flex items-center rounded-full border bg-card px-3 py-1 font-mono text-xs font-medium text-muted-foreground shadow-xs">
            {eyebrow}
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
            <p className="text-base text-pretty text-muted-foreground sm:text-lg">{description}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">{actions}</div>
          {footnote && <p className="font-mono text-xs text-muted-foreground">{footnote}</p>}
        </div>
      </main>
    </div>
  );
}
