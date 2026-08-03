import { put } from "@vercel/blob";

const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type BannerUploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Uploads an event banner image to Vercel Blob and returns its public URL
 * (stored as Event.photo). Real file storage rather than the base64 data-URL
 * shortcut used elsewhere (profile avatars, issue attachments) — see #109.
 */
export async function uploadEventBanner(file: File): Promise<BannerUploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Banner must be a PNG, JPEG, WEBP, or GIF image." };
  }
  if (file.size > MAX_BANNER_BYTES) {
    return { ok: false, error: "Banner image must be under 5MB." };
  }

  const extension = file.type.split("/")[1];
  const key = `event-banners/${crypto.randomUUID()}.${extension}`;

  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
  });

  return { ok: true, url: blob.url };
}
