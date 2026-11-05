import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { SITE_URL } from "@/lib/env";
import { BRAND } from "@/config/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: ["women's fashion", "beauty", "salon", "spa", "lifestyle", "jewellery", "India", "RAVANTRA"],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    locale: "en_IN",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.description },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F8F5EF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: "!rounded-none !border-line !bg-espresso !text-ivory !font-sans !text-sm",
          }}
        />
      </body>
    </html>
  );
}
