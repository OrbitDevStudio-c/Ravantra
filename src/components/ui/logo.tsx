import Image from "next/image";
import { cn } from "@/lib/utils";
import logoFull from "../../../public/brand/logo-full.png";
import logoFullLight from "../../../public/brand/logo-full-light.png";
import logoMark from "../../../public/brand/logo-mark.png";
import logoMarkLight from "../../../public/brand/logo-mark-light.png";
import logoWordmark from "../../../public/brand/logo-wordmark.png";
import logoWordmarkLight from "../../../public/brand/logo-wordmark-light.png";

/**
 * Official RAVANTRA logo (Heritage Luxury). Assets are generated from
 * public/pics/Ravantra Heritage Luxury Logo.png with transparent backgrounds.
 *
 * variant:
 *  - "full"     emblem + wordmark + tagline (footer, auth, admin login)
 *  - "lockup"   emblem beside the wordmark (header, compact spaces)
 *  - "mark"     emblem only
 *  - "wordmark" RAVANTRA lettering only
 */
export function Logo({
  variant = "lockup",
  tone = "dark",
  className,
  priority,
  height,
}: {
  variant?: "full" | "lockup" | "mark" | "wordmark";
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
  /** rendered height in px (width follows the aspect ratio) */
  height?: number;
}) {
  const light = tone === "light";
  if (variant === "lockup") {
    const h = height ?? 44;
    return (
      <span className={cn("inline-flex items-center gap-[0.35em]", className)} style={{ fontSize: h }}>
        <Image src={light ? logoMarkLight : logoMark} alt="" priority={priority} className="h-[1em] w-auto" sizes={`${Math.round(h * 1.1)}px`} />
        <Image src={light ? logoWordmarkLight : logoWordmark} alt="RAVANTRA" priority={priority} className="h-[0.42em] w-auto" sizes={`${Math.round(h * 2.9)}px`} />
      </span>
    );
  }
  const src = {
    full: light ? logoFullLight : logoFull,
    mark: light ? logoMarkLight : logoMark,
    wordmark: light ? logoWordmarkLight : logoWordmark,
  }[variant];
  const h = height ?? (variant === "full" ? 160 : variant === "mark" ? 56 : 28);
  return (
    <Image
      src={src}
      alt={variant === "mark" ? "RAVANTRA" : "RAVANTRA — Fashion · Beauty · Wellness · Lifestyle"}
      priority={priority}
      style={{ height: h, width: "auto" }}
      sizes={`${Math.round((h * src.width) / src.height)}px`}
      className={className}
    />
  );
}
