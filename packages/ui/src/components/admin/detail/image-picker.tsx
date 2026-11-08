"use client";

import { ImageUpIcon } from "lucide-react";
import { type PointerEvent, useRef } from "react";
import { Button } from "@kilotrace/ui/components/ui/button";
import { formatBytes } from "@kilotrace/ui/components/admin/data-table/format";
import { SAVE_BUTTON } from "./field-buttons";
import { usePreview } from "./use-preview";

/** The widths of the popover of an image: at first, and between which its bottom left corner resizes it, both sides alike. */
const IMAGE_WIDTH = { initial: 320, min: 272, max: 480 };
export const IMAGE_TYPES = "image/png,image/jpeg,image/webp";

/** The formats and the weight an image may have, e.g. « PNG, JPEG, WebP · 2 Mo max ». */
export function imageRules(accept: string, maxSize?: number) {
  const formats = accept.split(",").map((type) => {
    const name = type.trim().split("/")[1] ?? type;
    return name === "*" ? "images" : name === "webp" ? "WebP" : name === "svg+xml" ? "SVG" : name.toUpperCase();
  });
  const weight = maxSize === undefined ? null : `${formatBytes(maxSize)} max`;
  return [formats.join(", "), weight].filter(Boolean).join(" · ");
}

/**
 * The image shown, replaced by a file picked or dropped, or removed: saved
 * by « Valider » only, « Annuler » giving up. Its bottom left corner resizes it.
 */
export function ImagePicker({
  current,
  accept,
  maxSize,
  noneLabel,
  value,
  disabled,
  onChange,
  onError,
  onCancel,
  onDone,
}: {
  current: string | null;
  accept: string;
  maxSize?: number;
  noneLabel?: string;
  value: string | File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const preview = usePreview(value);
  const box = useRef<HTMLDivElement>(null);
  // Written to the box at each frame, React left out of the drag.
  const resize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const [x, from] = [event.clientX, box.current!.offsetWidth];
    let frame = 0;
    const move = (each: globalThis.PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Centred: each side moves as much as the corner.
        box.current!.style.width = `${Math.min(IMAGE_WIDTH.max, Math.max(IMAGE_WIDTH.min, from + 16 + 2 * (x - each.clientX))) - 16}px`;
      });
    };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
  };
  const take = (file: File | undefined) => {
    if (!file) return;
    const types = accept.split(",").map((each) => each.trim());
    if (!types.some((type) => (type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type))) return onError(`Format non accepté : ${imageRules(accept)} uniquement.`);
    if (maxSize !== undefined && file.size > maxSize) return onError(`Image trop lourde (${formatBytes(file.size)}) : ${formatBytes(maxSize)} maximum.`);
    onChange(file);
  };

  return (
    <div ref={box} className="flex flex-col gap-2" style={{ width: IMAGE_WIDTH.initial - 16 }}>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) take(event.dataTransfer.files[0]);
        }}
        className="relative grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- any URL, an object URL included
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageUpIcon className="size-5" aria-hidden />
            Choisir ou déposer une image
          </span>
        )}
        <input type="file" accept={accept} disabled={disabled} onChange={(event) => take(event.target.files?.[0])} aria-label="Choisir une image" className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="flex items-center gap-2">
        {noneLabel && (
          <Button size="sm" variant="ghost" disabled={disabled || value === null} onClick={() => onChange(null)}>
            {noneLabel}
          </Button>
        )}
        <Button size="sm" variant="outline" className="ml-auto" disabled={disabled} onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" className={SAVE_BUTTON} disabled={disabled || value === current} onClick={onDone}>
          Valider
        </Button>
      </div>
      <div
        role="separator"
        aria-label="Redimensionner"
        onPointerDown={resize}
        className="absolute bottom-0 left-0 size-4 cursor-nesw-resize touch-none rounded-bl-lg bg-[linear-gradient(45deg,transparent_45%,var(--color-border)_45%,var(--color-border)_55%,transparent_55%)]"
      />
    </div>
  );
}
