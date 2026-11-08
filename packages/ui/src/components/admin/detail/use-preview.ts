import { useEffect } from "react";

/**
 * The URLs of the files picked, shared by every view of one file (the field,
 * its popover, a cover) and freed a moment after the last one goes: a view
 * mounted again at once (a popover opened again, the double mount of
 * development) finds it still valid.
 */
const fileUrls = new Map<File, { url: string; views: number; timer?: ReturnType<typeof setTimeout> }>();
function fileUrl(file: File) {
  let entry = fileUrls.get(file);
  if (!entry) fileUrls.set(file, (entry = { url: URL.createObjectURL(file), views: 0 }));
  return entry;
}

/** The URL showing an image: its own, or that of a file picked. */
export function usePreview(value: string | File | null) {
  const file = value instanceof File ? value : null;
  useEffect(() => {
    if (!file) return;
    const entry = fileUrl(file);
    entry.views += 1;
    clearTimeout(entry.timer);
    return () => {
      entry.views -= 1;
      if (entry.views === 0)
        entry.timer = setTimeout(() => {
          URL.revokeObjectURL(entry.url);
          fileUrls.delete(file);
        }, 1000);
    };
  }, [file]);
  return file ? fileUrl(file).url : (value as string | null);
}
