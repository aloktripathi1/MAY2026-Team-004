import { put } from "@vercel/blob";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type PhotoUploadResult = { ok: true; url: string } | { ok: false; error: string };

/** Uploads a proposed club's photo to Vercel Blob and returns its public URL
 * (stored as ClubRequest.photo, then copied to Club.photo on approval). */
export async function uploadClubPhoto(file: File): Promise<PhotoUploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Photo must be a PNG, JPEG, WEBP, or GIF image." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo must be under 5MB." };
  }

  const extension = file.type.split("/")[1];
  const key = `club-photos/${crypto.randomUUID()}.${extension}`;

  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
  });

  return { ok: true, url: blob.url };
}
