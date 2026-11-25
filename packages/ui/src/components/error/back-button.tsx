"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@kilotrace/ui/components/ui/button";

/** Goes back to the previous page, or to `fallback` when the page was opened first. */
export function BackButton({ fallback, children }: { fallback: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="lg"
      className="sm:min-w-44"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      {children}
    </Button>
  );
}
