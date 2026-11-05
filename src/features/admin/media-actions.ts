"use server";

import { randomUUID } from "node:crypto";
import type { PermissionKey } from "@/lib/auth/permissions";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, guarded, UserError } from "./shared";

const FOLDER_PERMISSION: Record<string, PermissionKey> = {
  products: "products.manage",
  categories: "products.manage",
  divisions: "divisions.manage",
  marketing: "marketing.manage",
  salon: "appointments.manage",
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Safe image upload to the public `media` bucket. MIME + size validated here and by bucket config. */
export async function uploadMedia(formData: FormData) {
  const folder = String(formData.get("folder") ?? "products");
  const perm = FOLDER_PERMISSION[folder];
  if (!perm) return { ok: false as const, error: "Unknown upload folder." };
  return guarded(perm, async ({ sb }) => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Choose an image to upload.");
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) throw new UserError("Use a JPG, PNG, WebP or AVIF image.");
    if (file.size > MAX_IMAGE_BYTES) throw new UserError("Images must be 5 MB or smaller.");

    // sniff magic bytes so a renamed file can't masquerade as an image
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isJpeg = head[0] === 0xff && head[1] === 0xd8;
    const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    const isWebp = String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP";
    const isAvif = String.fromCharCode(...head.slice(4, 12)).startsWith("ftypav");
    if (!(isJpeg || isPng || isWebp || isAvif)) throw new UserError("That file doesn't look like a valid image.");

    const path = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${EXT[file.type]}`;
    const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(error.message);
    const { data } = sb.storage.from("media").getPublicUrl(path);
    return { url: data.publicUrl, path };
  });
}
