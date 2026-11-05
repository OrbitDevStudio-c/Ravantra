export const BRAND = {
  name: "RAVANTRA",
  tagline: "Everything that makes you, you.",
  description:
    "RAVANTRA is a modern women's lifestyle destination bringing fashion, beauty, salon & spa and lifestyle together — one account, one experience.",
  developer: { name: "OrbitDevStudio", url: "https://github.com/OrbitDevStudio-c" },
  contact: {
    email: "care@ravantra.test",
    phone: "+91 90000 00000",
    address: "RAVANTRA House, 14 Linking Road, Bandra West, Mumbai 400050",
    hours: "Tue–Sun · 10:00 am – 8:00 pm IST",
  },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Pinterest", href: "https://pinterest.com" },
    { label: "YouTube", href: "https://youtube.com" },
  ],
} as const;

export const SHIPPING_RULES = { freeAbove: 2999, flat: 149 } as const;
