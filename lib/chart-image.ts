/** Allowed raster types for chart screenshots (paste, file, camera capture). */
export const ALLOWED_CHART_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedChartMimeType = (typeof ALLOWED_CHART_MIME_TYPES)[number];

/** Max raw file size before base64 (~4MB). */
export const MAX_CHART_FILE_BYTES = 4_000_000;

/** Max data-URL length after base64 (~5.5MB string). */
export const MAX_CHART_DATA_URL_LENGTH = 5_500_000;

const DATA_URL_PREFIX = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

export function isAllowedChartMimeType(
  type: string
): type is AllowedChartMimeType {
  return (ALLOWED_CHART_MIME_TYPES as readonly string[]).includes(type);
}

export function isAllowedChartDataUrl(value: string): boolean {
  return DATA_URL_PREFIX.test(value.trim());
}

export function chartImageValidationError(
  value: string,
  label: string
): string | null {
  if (!value) {
    return `${label} is required.`;
  }
  if (!isAllowedChartDataUrl(value)) {
    return `${label} must be a PNG, JPEG, or WebP image.`;
  }
  if (value.length > MAX_CHART_DATA_URL_LENGTH) {
    return `${label} is too large. Please use a smaller image (under ~4MB).`;
  }
  return null;
}

export function fileToChartDataUrl(file: File): Promise<string> {
  if (!isAllowedChartMimeType(file.type)) {
    return Promise.reject(
      new Error("Only PNG, JPEG, or WebP images are allowed.")
    );
  }
  if (file.size > MAX_CHART_FILE_BYTES) {
    return Promise.reject(new Error("Image must be under 4MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result === "string" && isAllowedChartDataUrl(result)) {
        resolve(result);
      } else {
        reject(new Error("Could not read image."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}
