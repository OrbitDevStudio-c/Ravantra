"use client";

import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";

/**
 * Drop-in next/image wrapper.
 * - Unsplash (demo imagery): resized & format-negotiated (AVIF/WebP) directly
 *   by Unsplash's image CDN — no round-trip through our server, fastest TTFB,
 *   zero image-optimisation cost on Vercel.
 * - Everything else (e.g. Supabase Storage uploads): Next.js optimiser.
 */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 70));
  return url.toString();
}

export default function Image(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null;
  if (src && src.startsWith("https://images.unsplash.com/")) {
    return <NextImage {...props} loader={unsplashLoader} />;
  }
  return <NextImage {...props} />;
}
