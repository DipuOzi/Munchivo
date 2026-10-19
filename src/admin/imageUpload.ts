// Turns an uploaded image into a compressed data URL so it fits in localStorage.

import { fileToImageSource as storeFileToImageSource } from "./imageStore";

/** Uploads are compressed once and stored in IndexedDB (see imageStore.ts). */
export async function fileToImageSource(file: File): Promise<string> {
  return storeFileToImageSource(file);
}

/* ---------------------------------------------------------------- */
/* Storage recovery: shrink already-stored images until they fit.    */
/* ---------------------------------------------------------------- */

export function estimateContentBytes(content: unknown): number {
  return JSON.stringify(content).length;
}

/**
 * Walks the whole content object, recompressing inline data-URL images in
 * decreasing steps until the serialized content fits the storage budget.
 * Returns the same object when nothing needs to change (values untouched so
 * callers can compare identity).
 */
export async function fitContentForStorage(
  content: unknown,
  budgetChars = 4_200_000,
): Promise<unknown> {
  if (estimateContentBytes(content) <= budgetChars) return content;

  const steps: Array<[number, number]> = [
    [1100, 0.78],
    [900, 0.72],
    [700, 0.66],
    [520, 0.6],
    [380, 0.55],
  ];

  let current = content;
  for (const [maxDim, quality] of steps) {
    current = await recompressDataUrls(current, maxDim, quality);
    if (estimateContentBytes(current) <= budgetChars) return current;
  }
  return current;
}

async function recompressDataUrls(value: unknown, maxDim: number, quality: number): Promise<unknown> {
  if (typeof value === "string") {
    if (value.length > 150_000 && value.startsWith("data:image/")) {
      return recompressDataUrl(value, maxDim, quality);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => recompressDataUrls(item, maxDim, quality)));
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = await recompressDataUrls(child, maxDim, quality);
    }
    return result;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Renders a data URL through a canvas at a smaller size; returns the original on failure. */
async function recompressDataUrl(dataUrl: string, maxDim: number, quality: number): Promise<string> {
  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, width, height);

    // Preserve PNG for graphics that might need it; photos shrink much better as JPEG.
    const isPng = dataUrl.startsWith("data:image/png");
    const next = isPng && dataUrl.length < 400_000 ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
    return next.length < dataUrl.length ? next : dataUrl;
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the image"));
    image.src = src;
  });
}
