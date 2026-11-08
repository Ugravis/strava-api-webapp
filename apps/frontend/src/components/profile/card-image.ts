import { toPng } from "html-to-image";
import { DEFAULT_PROFILE_COLOR, shade } from "./profile-color";

/** Elements left out of the image: the buttons, useless on a picture. */
export const EXPORT_IGNORE = { "data-export-ignore": "" } as const;

const PIXEL_RATIO = 2;
/** Margin around the card, as a share of its width. */
const MARGIN = 0.1;
const PAINT = ["stroke", "fill", "stroke-opacity", "fill-opacity"] as const;
/** Drawn in place of an image that cannot be fetched again, e.g. an avatar of another site. */
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Whether the node is left out: marked so, or an image which did not load (its fallback is shown instead). */
const ignored = (node: Node) =>
  (node instanceof HTMLElement && node.dataset.exportIgnore !== undefined) ||
  (node instanceof HTMLImageElement && (!node.complete || node.naturalWidth === 0));

/**
 * Writes the computed paint of the SVG shapes inline: the library copies the
 * computed style of the elements but not of the SVG shapes, which would lose
 * the colors given by classes (e.g. `stroke-primary`). Returns how to undo it.
 */
function inlineSvgPaint(element: HTMLElement): () => void {
  const previous = [...element.querySelectorAll<SVGElement>("svg *")].map((shape) => {
    const style = shape.getAttribute("style");
    const computed = getComputedStyle(shape);
    for (const property of PAINT) shape.style.setProperty(property, computed.getPropertyValue(property));
    return [shape, style] as const;
  });
  return () => {
    for (const [shape, style] of previous) {
      if (style === null) shape.removeAttribute("style");
      else shape.setAttribute("style", style);
    }
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * The picture of the card cut inside its border, along its rounded corners:
 * translucent, rounded to whole pixels, the border made a pale edge on the
 * background. The shadow sets the card apart instead.
 */
function withoutBorder(card: HTMLImageElement, style: CSSStyleDeclaration): HTMLCanvasElement {
  // A pixel more, for the width rounded by the library.
  const inset = (parseFloat(style.borderRightWidth) + 1) * PIXEL_RATIO;
  const radius = Math.max(0, parseFloat(style.borderTopLeftRadius) * PIXEL_RATIO - inset);
  const canvas = document.createElement("canvas");
  canvas.width = card.width;
  canvas.height = card.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.beginPath();
  context.roundRect(inset, inset, card.width - inset * 2, card.height - inset * 2, radius);
  context.clip();
  context.drawImage(card, 0, 0);
  return canvas;
}

/**
 * Picture of a profile card, without the elements marked `EXPORT_IGNORE`,
 * framed by a margin on a background in the hue of the profile.
 */
export async function cardImage(element: HTMLElement, color: string | null): Promise<Blob> {
  const restore = inlineSvgPaint(element);
  let cardUrl: string;
  try {
    cardUrl = await toPng(element, {
      pixelRatio: PIXEL_RATIO,
      // Sites hosting avatars, as Google, refuse requests telling where they come from.
      fetchRequestInit: { referrerPolicy: "no-referrer" },
      imagePlaceholder: TRANSPARENT_PIXEL,
      filter: (node) => !ignored(node),
    });
  } finally {
    restore();
  }
  const card = withoutBorder(await loadImage(cardUrl), getComputedStyle(element));
  const margin = Math.round(card.width * MARGIN);
  const canvas = document.createElement("canvas");
  canvas.width = card.width + margin * 2;
  canvas.height = card.height + margin * 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  const base = color ?? DEFAULT_PROFILE_COLOR;
  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, shade(base, 0.35));
  background.addColorStop(0.5, base);
  background.addColorStop(1, shade(base, -0.6));
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.shadowColor = "rgb(0 0 0 / 0.35)";
  context.shadowBlur = margin * 0.6;
  context.shadowOffsetY = margin * 0.15;
  context.drawImage(card, margin, margin);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Empty image"))), "image/png"),
  );
}
