"use client";

import type { ReactNode } from "react";
import { type CellImage, ImageCover } from "@/components/admin/data-table";

/**
 * A large image across the top of the detail, above its header; a click opens
 * it whole. A grey band without an image: a detail that has a cover has one
 * for every row. Small, an image is a field: an `imageColumn` in
 * `DetailColumnFields`.
 */
export function DetailCover({ image }: { image: CellImage | null | undefined }) {
  return <ImageCover image={image} className="h-40 rounded-none" />;
}

/** Who or what the detail is about: a picture, a name, what tells it apart, and its buttons. */
export function DetailHeader({
  media,
  title,
  subtitle,
  marks,
  actions,
}: {
  /** An avatar, a cover, an icon. */
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Beside the title: a role, a suspended mark. */
  marks?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3 p-4">
      {media && <div className="shrink-0">{media}</div>}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          <span className="truncate">{title}</span>
          {marks}
        </h2>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
