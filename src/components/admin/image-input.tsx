"use client";

import * as React from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/features/admin/media-actions";
import { cn } from "@/lib/utils";

/** URL field + upload button (Supabase Storage). Shows a small preview. */
export function ImageInput({
  value,
  onChange,
  folder,
  label = "Image",
  className,
  name,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: "products" | "categories" | "divisions" | "marketing" | "salon";
  label?: string;
  className?: string;
  name?: string;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const onFile = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    setUploading(true);
    try {
      const res = await uploadMedia(fd);
      if (res.ok && res.data) {
        onChange(res.data.url);
        toast.success("Image uploaded");
      } else if (!res.ok) toast.error(res.error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const valid = /^https?:\/\//.test(value);

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="relative size-16 shrink-0 overflow-hidden border border-line bg-champagne/50">
        {valid && <Image src={value} alt="" fill sizes="64px" className="object-cover" quality={60} unoptimized={!value.includes("unsplash") && !value.includes("supabase")} />}
      </div>
      <div className="min-w-0 flex-1">
        <span className="eyebrow mb-1 block text-[0.6rem] text-ink-soft">{label}</span>
        <div className="flex gap-2">
          <input name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="field-box min-w-0 flex-1 text-xs" aria-label={`${label} URL`} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex shrink-0 items-center gap-1.5 border border-line-strong bg-white px-3 text-xs hover:border-espresso disabled:opacity-50"
          >
            <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </div>
        <p className="mt-1 text-[0.65rem] text-ink-mute">JPG, PNG, WebP or AVIF · max 5 MB</p>
      </div>
    </div>
  );
}
