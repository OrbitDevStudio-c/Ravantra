/**
 * RAVANTRA — canonical DEMO dataset.
 *
 * This file is the single source of truth for fictional demo content:
 *  - `npm run db:seed:generate` turns it into supabase/seed.sql
 *  - when Supabase env vars are absent, the storefront reads it directly
 *    (read-only "preview mode") so `npm run dev` works with zero setup.
 *
 * Everything here is fictional. Reviews, orders, customers and
 * appointments are flagged `isDemo` and labelled as such in the UI.
 *
 * Keep this module dependency-free (type imports only) so it can be
 * executed by Node's built-in TypeScript stripping.
 */
import type {
  Category,
  Coupon,
  Division,
  Product,
  ProductImage,
  ProductVariant,
  Promotion,
  Review,
  Service,
  Stylist,
} from "@/types";

/** Deterministic UUID: group + sequence → valid v4-shaped UUID */
export function u(group: number, n: number): string {
  const g = group.toString(16).padStart(8, "0");
  const s = n.toString(16).padStart(12, "0");
  return `${g}-0000-4000-8000-${s}`;
}

/** Unsplash photo id -> CDN URL; local paths (e.g. "/images/fashion/x.webp") pass through. */
export const img = (id: string, w = 1600) =>
  id.startsWith("/") ? id : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Supplied fashion photography (public/images/fashion) */
export const FASHION_IMG = {
  banner: "/images/fashion/fashion-banner.webp",
  bannerWide: "/images/fashion/fashion-banner-wide.webp",
  hoodie: "/images/fashion/tiger-crest-hoodie.webp",
  sequinSkirt: "/images/fashion/blush-sequin-mini-skirt.webp",
  crystalGown: "/images/fashion/stardust-crystal-gown.webp",
  cardigan: "/images/fashion/noir-cropped-cardigan.webp",
  lavenderSaree: "/images/fashion/lavender-tissue-saree.webp",
  drapedCoord: "/images/fashion/ivory-draped-coord.webp",
  bodysuit: "/images/fashion/onyx-gloss-bodysuit.webp",
  rougeSaree: "/images/fashion/rouge-predraped-saree.webp",
  lehenga: "/images/fashion/festive-lehenga.webp",
  resortSwim: "/images/fashion/resort-swim.webp",
} as const;

/** Beauty & Care imagery (supplied photography) */
export const BEAUTY_IMG = {
  flatLay: "/images/beauty/beauty-flat-lay.webp",
  makeup: "/images/beauty/makeup-portrait.webp",
} as const;

/** AUREYA landing-page imagery (supplied photography) */
export const AUREYA_IMG = {
  hero: FASHION_IMG.banner,
  editorial: FASHION_IMG.lavenderSaree,
} as const;

/* ------------------------------------------------------------------ */
/* Divisions                                                            */
/* ------------------------------------------------------------------ */

export const DIVISION_IDS = {
  fashion: u(1, 1),
  beauty: u(1, 2),
  salon: u(1, 3),
  lifestyle: u(1, 4),
} as const;

export const divisions: Division[] = [
  {
    id: DIVISION_IDS.fashion,
    slug: "fashion",
    name: "AUREYA by RAVANTRA",
    shortName: "Fashion",
    subBrand: "AUREYA",
    tagline: "Elegance in Every Thread.",
    description:
      "AUREYA is RAVANTRA's women's fashion house — Indian heritage craft meets contemporary silhouettes, from handwoven sarees to statement evening wear and everyday essentials.",
    accentColor: "#6B1E2E",
    heroImage: img(FASHION_IMG.hoodie),
    bannerImage: img(AUREYA_IMG.hero),
    logoUrl: null,
    sortOrder: 1,
    isActive: true,
    kind: "products",
  },
  {
    id: DIVISION_IDS.beauty,
    slug: "beauty",
    subBrand: null,
    name: "RAVANTRA Beauty & Care",
    shortName: "Beauty & Care",
    tagline: "Rituals that feel like a pause.",
    description:
      "Clean skincare, couture makeup and haircare formulated with Indian botanicals — gentle, effective and made to be used every day.",
    accentColor: "#B98B7F",
    heroImage: img("1596462502278-27bfdc403348"),
    bannerImage: img("1617897903246-719242758050"),
    logoUrl: null,
    sortOrder: 2,
    isActive: true,
    kind: "products",
  },
  {
    id: DIVISION_IDS.salon,
    slug: "salon-spa",
    subBrand: null,
    name: "RAVANTRA Salon & Spa",
    shortName: "Salon & Spa",
    tagline: "An hour that belongs only to you.",
    description:
      "Precision hair, results-driven facials, bridal artistry and restorative spa rituals — delivered by senior specialists in a calm, unhurried space.",
    accentColor: "#7C8573",
    heroImage: img("1562322140-8baeececf3df"),
    bannerImage: img("1560066984-138dadb4c035"),
    logoUrl: null,
    sortOrder: 3,
    isActive: true,
    kind: "services",
  },
  {
    id: DIVISION_IDS.lifestyle,
    slug: "lifestyle",
    subBrand: null,
    name: "RAVANTRA Lifestyle",
    shortName: "Lifestyle",
    tagline: "The finishing touch, kept for years.",
    description:
      "Leather handbags, fine-finish jewellery, fragrance and accessories — small objects with a long life, chosen to be worn and passed on.",
    accentColor: "#B69A72",
    heroImage: img("1584917865442-de89df76afd3"),
    bannerImage: img("1599643478518-a784e5dc4c8f"),
    logoUrl: null,
    sortOrder: 4,
    isActive: true,
    kind: "products",
  },
];

/* ------------------------------------------------------------------ */
/* Categories                                                           */
/* ------------------------------------------------------------------ */

type CatDef = [key: string, div: keyof typeof DIVISION_IDS, name: string, desc: string, image: string, featured?: boolean, parent?: string];

const catDefs: CatDef[] = [
  // AUREYA (Fashion)
  ["ethnic-wear", "fashion", "Ethnic Wear", "Handwoven and ready-to-wear sarees.", FASHION_IMG.rougeSaree, true],
  ["western-wear", "fashion", "Western Wear", "Tops, knits and co-ord sets.", FASHION_IMG.drapedCoord, true],
  ["occasion-wear", "fashion", "Occasion Wear", "Gowns, sequins and evening statements.", FASHION_IMG.crystalGown, true],
  ["sarees", "fashion", "Sarees", "Tissue silks and pre-draped sarees.", FASHION_IMG.lavenderSaree, false, "ethnic-wear"],
  ["tops", "fashion", "Tops", "Hoodies, knits and everyday tops.", FASHION_IMG.hoodie, false, "western-wear"],
  ["co-ord-sets", "fashion", "Co-ord Sets", "Matching sets, ready to wear.", FASHION_IMG.drapedCoord, false, "western-wear"],
  ["party-wear", "fashion", "Party Wear", "Gowns, bodysuits and sequins for after dark.", FASHION_IMG.crystalGown, false, "occasion-wear"],
  ["skincare", "beauty", "Skincare", "Serums, oils and daily rituals.", "1617897903246-719242758050", true],
  ["makeup", "beauty", "Makeup", "Palettes, mascara and tools.", "1596462502278-27bfdc403348"],
  ["haircare", "beauty", "Haircare", "Oils and treatments for every texture.", "1522337360788-8b13dee7a37e"],
  ["beauty-essentials", "beauty", "Beauty Essentials", "Body care and nail lacquers.", "1540555700478-4be289fbecef"],
  ["handbags", "lifestyle", "Handbags", "Top-handles, totes and crossbodies.", "1584917865442-de89df76afd3", true],
  ["jewellery", "lifestyle", "Jewellery", "Pearls, gemstones and gold-finish pieces.", "1515562141207-7a88fb7ce338", true],
  ["perfumes", "lifestyle", "Perfumes", "Eau de parfum, blended in Kannauj.", "1588405748880-12d1d2a59f75"],
  ["lifestyle-accessories", "lifestyle", "Accessories", "Watches and everyday objects.", "1524592094714-0f0654e20314"],
];

export const categories: Category[] = catDefs.map(([slug, div, name, desc, image, featured], i) => ({
  id: u(2, i + 1),
  divisionId: DIVISION_IDS[div],
  parentId: null,
  slug,
  name,
  description: desc,
  image: img(image, 1200),
  sortOrder: i + 1,
  isFeatured: Boolean(featured),
}));
// resolve parents within the same division
catDefs.forEach(([, div, , , , , parent], i) => {
  if (!parent) return;
  const p = categories.find((c) => c.slug === parent && c.divisionId === DIVISION_IDS[div]);
  if (!p) throw new Error(`Unknown parent category ${parent}`);
  categories[i].parentId = p.id;
});

const catId = (slug: string, div: keyof typeof DIVISION_IDS) => {
  const c = categories.find((x) => x.slug === slug && x.divisionId === DIVISION_IDS[div]);
  if (!c) throw new Error(`Unknown category ${slug}`);
  return c.id;
};

/* ------------------------------------------------------------------ */
/* Products                                                             */
/* ------------------------------------------------------------------ */

type VDef = {
  size?: string;
  color?: string;
  hex?: string;
  volume?: string;
  price?: number;
  sale?: number | null;
  stock: number;
};

type PDef = {
  slug: string;
  name: string;
  div: "fashion" | "beauty" | "lifestyle";
  cat: string;
  price: number;
  sale?: number;
  images: string[];
  short: string;
  desc: string;
  highlights: string[];
  tags: string[];
  ingredients?: string;
  featured?: boolean;
  isNew?: boolean;
  daysOld: number;
  variants: VDef[];
};

const S = (sizes: string[], stock: number[], extra: Omit<VDef, "stock" | "size"> = {}): VDef[] =>
  sizes.map((size, i) => ({ size, stock: stock[i] ?? 8, ...extra }));

const pdefs: PDef[] = [
  // ---------------- AUREYA by RAVANTRA (Fashion) ----------------
  {
    slug: "lavender-tissue-silk-saree",
    name: "Lavender Tissue Silk Saree",
    div: "fashion",
    cat: "sarees",
    price: 24900,
    sale: 21900,
    images: [FASHION_IMG.lavenderSaree],
    short: "Shimmering lilac tissue silk with a gold-woven border.",
    desc: "Light-catching tissue silk in soft lavender, woven with a fine gold border and a pallu that falls in liquid pleats. Paired with a hand-embellished sweetheart blouse worked in zardozi, sequins and cut beads — made for receptions, sangeets and festive evenings.",
    highlights: ["Pure tissue silk", "Hand-embellished zardozi blouse", "Gold-woven border & pallu", "Blouse stitched to measure"],
    tags: ["saree", "festive", "bridal", "new-season"],
    featured: true,
    isNew: true,
    daysOld: 4,
    variants: [
      { size: "Blouse 34", color: "Lavender Gold", hex: "#B9A6C9", stock: 4 },
      { size: "Blouse 36", color: "Lavender Gold", hex: "#B9A6C9", stock: 5 },
      { size: "Blouse 38", color: "Lavender Gold", hex: "#B9A6C9", stock: 3 },
    ],
  },
  {
    slug: "rouge-bandhani-predraped-saree",
    name: "Rouge Bandhani Pre-draped Saree",
    div: "fashion",
    cat: "sarees",
    price: 12500,
    images: [FASHION_IMG.rougeSaree],
    short: "A ready-to-wear bandhani drape with an embroidered bustier blouse.",
    desc: "Traditional red-and-ivory bandhani on featherlight georgette, pre-pleated and stitched so it drapes in under a minute. The sleeveless bustier blouse is embroidered with gold thread and sequins along a scalloped neckline — heritage craft, modern ease.",
    highlights: ["Hand-tied bandhani print", "Pre-stitched pleats & pallu", "Embroidered bustier blouse", "Concealed side zip"],
    tags: ["saree", "festive", "ready-to-wear"],
    featured: true,
    isNew: true,
    daysOld: 7,
    variants: S(["XS", "S", "M", "L"], [3, 6, 7, 4], { color: "Rouge", hex: "#B2232F" }),
  },
  {
    slug: "stardust-crystal-halter-gown",
    name: "Stardust Crystal Halter Gown",
    div: "fashion",
    cat: "party-wear",
    price: 28500,
    images: [FASHION_IMG.crystalGown],
    short: "A hand-beaded silver gown with a sculpted halter and cut-out waist.",
    desc: "Thousands of hand-set crystals and bugle beads trace a sculpted halter bodice, an open midriff and a column skirt that ends in shimmering fringe. Fully lined in soft mesh so it moves like light and wears comfortably all night.",
    highlights: ["Hand-beaded crystals & bugle beads", "Halter neck with cut-out waist", "Fringed hem", "Mesh lining"],
    tags: ["evening", "occasion", "statement"],
    featured: true,
    daysOld: 14,
    variants: S(["XS", "S", "M", "L"], [2, 4, 3, 2], { color: "Silver", hex: "#C9CCD1" }),
  },
  {
    slug: "ivory-draped-coord-set",
    name: "Ivory Draped Co-ord Set",
    div: "fashion",
    cat: "co-ord-sets",
    price: 9800,
    sale: 8490,
    images: [FASHION_IMG.drapedCoord],
    short: "A strappy bralette and fluid draped maxi skirt in ivory.",
    desc: "A minimalist two-piece in ivory crepe jersey: a triangle bralette with criss-cross waist straps and a high-rise maxi skirt draped and ruched at the hip. Wear it together for resort evenings, or style each piece on its own.",
    highlights: ["Stretch crepe jersey", "Adjustable criss-cross straps", "Ruched draped skirt", "Wear together or apart"],
    tags: ["co-ord", "resort", "minimal"],
    isNew: true,
    daysOld: 10,
    variants: S(["XS", "S", "M", "L"], [5, 8, 7, 4], { color: "Ivory", hex: "#F2EEE6" }),
  },
  {
    slug: "blush-sequin-mini-skirt",
    name: "Blush Sequin Mini Skirt",
    div: "fashion",
    cat: "party-wear",
    price: 4290,
    images: [FASHION_IMG.sequinSkirt],
    short: "A high-waist mini covered in blush micro-sequins.",
    desc: "A sleek high-waist mini skirt densely embroidered with blush and rose micro-sequins on a soft satin lining. Pair it with a crisp white tank and strappy heels for an effortless night out.",
    highlights: ["Hand-embroidered micro-sequins", "Satin lining", "Concealed back zip", "High-rise fit"],
    tags: ["party", "sequin", "night-out"],
    daysOld: 26,
    variants: S(["XS", "S", "M", "L"], [6, 9, 8, 3], { color: "Blush", hex: "#E4A7B5" }),
  },
  {
    slug: "onyx-gloss-sculpt-bodysuit",
    name: "Onyx Gloss Sculpt Bodysuit",
    div: "fashion",
    cat: "party-wear",
    price: 6990,
    images: [FASHION_IMG.bodysuit],
    short: "A high-shine, body-sculpting plunge bodysuit.",
    desc: "A glossy patent-finish bodysuit with a deep plunge, internal boning and a high-cut leg that sculpts and smooths. Equally striking as resort swimwear or layered under tailoring for evening.",
    highlights: ["High-shine patent finish", "Internal boning", "High-cut leg", "Snap closure"],
    tags: ["bodysuit", "swim", "evening"],
    daysOld: 33,
    variants: S(["XS", "S", "M", "L"], [3, 5, 5, 2], { color: "Onyx", hex: "#151214" }),
  },
  {
    slug: "tiger-crest-embroidered-hoodie",
    name: "Tiger Crest Embroidered Hoodie",
    div: "fashion",
    cat: "tops",
    price: 3990,
    sale: 3290,
    images: [FASHION_IMG.hoodie],
    short: "An oversized black hoodie with a hand-embroidered tiger crest.",
    desc: "Heavyweight brushed cotton fleece cut in a relaxed, oversized fit, finished with a richly embroidered tiger crest across the back in crimson and antique-gold thread. Style it over a pleated tartan mini for off-duty ease.",
    highlights: ["Heavyweight 400 GSM fleece", "Hand-embroidered back crest", "Oversized fit", "Ribbed cuffs & hem"],
    tags: ["streetwear", "embroidered", "cozy"],
    featured: true,
    isNew: true,
    daysOld: 5,
    variants: S(["XS", "S", "M", "L", "XL"], [7, 12, 14, 9, 5], { color: "Black", hex: "#141214" }),
  },
  {
    slug: "noir-cropped-button-cardigan",
    name: "Noir Cropped Button Cardigan",
    div: "fashion",
    cat: "tops",
    price: 2790,
    images: [FASHION_IMG.cardigan],
    short: "A fitted cropped cardigan in soft black rib knit.",
    desc: "A slim, cropped cardigan in fine stretch rib with long sleeves and a delicate button placket — wear it buttoned as a top, or open over a bralette with high-rise denim.",
    highlights: ["Fine stretch rib knit", "Cropped length", "Slim fit", "Machine washable"],
    tags: ["knit", "everyday", "layering"],
    daysOld: 40,
    variants: S(["XS", "S", "M", "L"], [9, 13, 11, 6], { color: "Noir", hex: "#1B1719" }),
  },
  {
    slug: "noir-plunge-knit-top",
    name: "Noir Plunge Knit Top",
    div: "fashion",
    cat: "tops",
    price: 2490,
    images: [FASHION_IMG.banner],
    short: "A sleek deep-V knit top made for gold jewellery.",
    desc: "A fitted short-sleeve knit in a soft viscose blend with a deep plunging V that frames layered gold chains beautifully. A wardrobe staple that goes from day to dinner.",
    highlights: ["Soft viscose-blend knit", "Deep V-neck", "Fitted silhouette", "Hand wash cold"],
    tags: ["knit", "basics", "evening"],
    daysOld: 18,
    variants: S(["XS", "S", "M", "L"], [8, 12, 10, 5], { color: "Black", hex: "#141214" }),
  },

  // ---------------- BEAUTY ----------------
  {
    slug: "botanical-glow-face-oil",
    name: "Botanical Glow Face Oil",
    div: "beauty",
    cat: "skincare",
    price: 1890,
    images: ["1617897903246-719242758050", "1620916566398-39f1143ab7be"],
    short: "Kumkumadi and rosehip for a lit-from-within glow.",
    desc: "A lightweight overnight oil inspired by the Ayurvedic kumkumadi tailam, blended with cold-pressed rosehip and squalane. Absorbs quickly and wakes skin up softer, brighter and more even.",
    highlights: ["Non-comedogenic", "Fragrance free", "Vegan", "Dermatologically tested"],
    tags: ["glow", "night", "ayurveda"],
    ingredients:
      "Squalane, Rosa Canina (Rosehip) Seed Oil, Crocus Sativus (Saffron) Extract, Santalum Album (Sandalwood) Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Tocopherol (Vitamin E).",
    featured: true,
    daysOld: 50,
    variants: [
      { volume: "15 ml", stock: 22 },
      { volume: "30 ml", price: 3290, stock: 14 },
    ],
  },
  {
    slug: "vitamin-c-brightening-serum",
    name: "Vitamin C Brightening Serum",
    div: "beauty",
    cat: "skincare",
    price: 1490,
    sale: 1290,
    images: ["1505944270255-72b8c68c6a70", "1608248543803-ba4f8c70ae0b"],
    short: "15% stabilised vitamin C with ferulic acid.",
    desc: "A silky water-gel serum with 15% ethyl ascorbic acid, ferulic acid and amla extract to fade dullness and protect against daily environmental stress.",
    highlights: ["15% vitamin C", "Ferulic acid", "Amla extract", "Suitable for all skin types"],
    tags: ["brightening", "morning"],
    ingredients:
      "Aqua, Ethyl Ascorbic Acid, Propanediol, Glycerin, Ferulic Acid, Phyllanthus Emblica (Amla) Fruit Extract, Sodium Hyaluronate, Panthenol.",
    daysOld: 85,
    variants: [{ volume: "30 ml", stock: 31 }],
  },
  {
    slug: "daily-ritual-skincare-trio",
    name: "Daily Ritual Skincare Trio",
    div: "beauty",
    cat: "skincare",
    price: 3450,
    images: ["1631729371254-42c2892f0e6e", "1556228578-8c89e6adf883"],
    short: "Cleanse, tone and moisturise — the essential edit.",
    desc: "Our three bestselling essentials in one considered set: a milky rice-water cleanser, a rose and niacinamide toner and a whipped ceramide moisturiser.",
    highlights: ["3 full sizes", "Ceramides & niacinamide", "Gift-ready box", "Save 20% vs. single"],
    tags: ["gift", "routine"],
    ingredients:
      "Cleanser: Oryza Sativa (Rice) Water, Glycerin. Toner: Rosa Damascena Flower Water, Niacinamide. Moisturiser: Ceramide NP, Shea Butter, Squalane.",
    featured: true,
    daysOld: 22,
    variants: [{ size: "Set of 3", stock: 9 }],
  },
  {
    slug: "silk-touch-body-lotion",
    name: "Silk Touch Body Lotion",
    div: "beauty",
    cat: "beauty-essentials",
    price: 990,
    images: ["1540555700478-4be289fbecef", "1544161515-4ab6ce6db874"],
    short: "Fast-absorbing lotion with silk proteins and shea.",
    desc: "A lightweight, non-greasy body lotion that sinks in within seconds. Hydrolysed silk proteins and shea butter leave skin velvety, with a whisper of white tea.",
    highlights: ["48h hydration", "Non-greasy", "White tea scent", "Paraben free"],
    tags: ["body", "hydration"],
    ingredients: "Aqua, Butyrospermum Parkii (Shea) Butter, Hydrolyzed Silk, Glycerin, Camellia Sinensis Leaf Extract.",
    daysOld: 110,
    variants: [
      { volume: "200 ml", stock: 40 },
      { volume: "400 ml", price: 1690, stock: 18 },
    ],
  },
  {
    slug: "atelier-brush-collection",
    name: "Atelier Brush Collection — 12 pc",
    div: "beauty",
    cat: "makeup",
    price: 2750,
    sale: 2290,
    images: ["1596462502278-27bfdc403348", "1512496015851-a90fb38ba796"],
    short: "Twelve vegan brushes for face, eyes and lips.",
    desc: "A complete set of twelve ultra-soft synthetic brushes with weighted rose-gold ferrules, designed with our salon artists for flawless blending.",
    highlights: ["Cruelty-free fibres", "Weighted handles", "Travel pouch", "12 pieces"],
    tags: ["tools", "gift"],
    daysOld: 70,
    variants: [{ size: "12 pieces", color: "Blush", hex: "#E7C0B5", stock: 16 }],
  },
  {
    slug: "dusk-to-dawn-eyeshadow-palette",
    name: "Dusk to Dawn Eyeshadow Palette",
    div: "beauty",
    cat: "makeup",
    price: 2190,
    images: ["1512496015851-a90fb38ba796", "1596462502278-27bfdc403348"],
    short: "Thirty-five shades from soft mattes to molten foils.",
    desc: "A wearable range of warm neutrals, terracottas and molten metallics. Buttery, highly pigmented and built to last through long days and longer celebrations.",
    highlights: ["35 shades", "Blendable mattes", "Foil shimmers", "Mirror included"],
    tags: ["eyes", "palette"],
    daysOld: 100,
    variants: [{ size: "35 shades", stock: 5 }],
  },
  {
    slug: "volume-couture-mascara",
    name: "Volume Couture Mascara",
    div: "beauty",
    cat: "makeup",
    price: 1150,
    images: ["1631214540553-ff044a3ff1d4", "1487412947147-5cebf100ffc2"],
    short: "Buildable volume without clumps or flakes.",
    desc: "An hourglass brush and a flexible film-forming formula lift, separate and volumise lashes for up to 18 hours. Smudge-proof, yet removes easily with warm water.",
    highlights: ["18-hour wear", "Smudge-proof", "Ophthalmologist tested", "Tubing technology"],
    tags: ["eyes", "bestseller"],
    daysOld: 130,
    variants: [
      { color: "Noir", hex: "#141414", stock: 28 },
      { color: "Espresso", hex: "#3B2A24", stock: 3 },
    ],
  },
  {
    slug: "argan-repair-hair-oil",
    name: "Argan Repair Hair Oil",
    div: "beauty",
    cat: "haircare",
    price: 1290,
    images: ["1522337360788-8b13dee7a37e", "1595476108010-b4d1f102b1b1"],
    short: "Bhringraj and argan for soft, strong lengths.",
    desc: "A pre-wash and finishing oil blending Moroccan argan with Ayurvedic bhringraj and amla. Tames frizz, adds shine and strengthens lengths from the first use.",
    highlights: ["Pre-wash & finishing", "Silicone free", "Colour-safe", "All hair types"],
    tags: ["hair", "ayurveda"],
    ingredients:
      "Argania Spinosa (Argan) Kernel Oil, Eclipta Alba (Bhringraj) Extract, Phyllanthus Emblica (Amla) Extract, Cocos Nucifera Oil, Tocopherol.",
    featured: true,
    daysOld: 45,
    variants: [
      { volume: "50 ml", stock: 24 },
      { volume: "100 ml", price: 2190, stock: 11 },
    ],
  },
  {
    slug: "gel-lacquer-nail-duo",
    name: "Gel Lacquer Nail Duo",
    div: "beauty",
    cat: "beauty-essentials",
    price: 790,
    images: ["1607779097040-26e80aa78e66", "1457972729786-0411a3b2b626"],
    short: "Salon-gel shine with no lamp required.",
    desc: "Our long-wear lacquer duo: a high-pigment colour and a plumping gel top coat. Ten-free formula, chip-resistant for up to ten days.",
    highlights: ["10-free formula", "No UV lamp", "Up to 10 days wear", "Vegan"],
    tags: ["nails"],
    isNew: true,
    daysOld: 5,
    variants: [
      { color: "Lilac Mist", hex: "#BFB4CC", stock: 15 },
      { color: "Oxblood", hex: "#5A1E25", stock: 12 },
      { color: "Nude Silk", hex: "#D8B9A4", stock: 2 },
    ],
  },

  // ---------------- LIFESTYLE ----------------
  {
    slug: "rosso-top-handle-bag",
    name: "Rosso Top-Handle Bag",
    div: "lifestyle",
    cat: "handbags",
    price: 11900,
    sale: 9990,
    images: ["1584917865442-de89df76afd3", "1483985988355-763728e1935b"],
    short: "Structured full-grain leather with a gold clasp.",
    desc: "Crafted from vegetable-tanned full-grain leather with a sculpted top handle, detachable shoulder strap and a polished gold-tone clasp. Suede-lined with a zip inner pocket.",
    highlights: ["Full-grain leather", "Detachable strap", "Suede lining", "Dust bag included"],
    tags: ["leather", "statement"],
    featured: true,
    daysOld: 35,
    variants: [
      { color: "Rosso", hex: "#B3202A", stock: 6 },
      { color: "Espresso", hex: "#3B2A24", stock: 4 },
    ],
  },
  {
    slug: "marigold-woven-basket-bag",
    name: "Marigold Woven Basket Bag",
    div: "lifestyle",
    cat: "handbags",
    price: 7450,
    images: ["1590874103328-eac38a683ce7", "1483985988355-763728e1935b"],
    short: "Hand-woven rattan with tan leather trims.",
    desc: "Hand-woven by artisans in Assam, this structured basket bag pairs natural rattan with saddle-tan leather trims. A cotton drawstring liner keeps essentials secure.",
    highlights: ["Hand-woven rattan", "Leather trims", "Drawstring liner", "Artisan made"],
    tags: ["resort", "handcrafted"],
    daysOld: 60,
    variants: [{ color: "Marigold", hex: "#D9773A", stock: 7 }],
  },
  {
    slug: "cognac-everyday-crossbody",
    name: "Cognac Everyday Crossbody",
    div: "lifestyle",
    cat: "handbags",
    price: 5990,
    images: ["1600857062241-98e5dba7f214", "1483985988355-763728e1935b"],
    short: "A clean-lined crossbody for daily essentials.",
    desc: "Smooth cognac leather, an adjustable strap and three neat compartments — sized for phone, cards and keys, and designed to go with everything.",
    highlights: ["Smooth leather", "Adjustable strap", "3 compartments", "Magnetic closure"],
    tags: ["leather", "everyday"],
    isNew: true,
    daysOld: 8,
    variants: [
      { color: "Cognac", hex: "#9A5B34", stock: 13 },
      { color: "Black", hex: "#1A1A1A", stock: 9 },
    ],
  },
  {
    slug: "heirloom-pearl-strand",
    name: "Heirloom Pearl Strand",
    div: "lifestyle",
    cat: "jewellery",
    price: 8900,
    images: ["1515562141207-7a88fb7ce338", "1599643478518-a784e5dc4c8f"],
    short: "Freshwater pearls hand-knotted on silk.",
    desc: "Lustrous AAA freshwater pearls, individually hand-knotted on pure silk thread and finished with an 18k gold-plated sterling silver clasp. Presented in a velvet case.",
    highlights: ["AAA freshwater pearls", "Hand-knotted", "Sterling silver clasp", "Velvet case"],
    tags: ["pearl", "bridal", "gift"],
    featured: true,
    daysOld: 28,
    variants: [
      { size: '16"', stock: 5 },
      { size: '18"', price: 9900, stock: 4 },
    ],
  },
  {
    slug: "celestial-gemstone-pendant",
    name: "Celestial Gemstone Pendant",
    div: "lifestyle",
    cat: "jewellery",
    price: 4650,
    images: ["1599643478518-a784e5dc4c8f", "1515562141207-7a88fb7ce338"],
    short: "A crescent pendant set with a London blue topaz.",
    desc: "A gold-vermeil crescent cradles a faceted London blue topaz on a fine adjustable chain. Layer with your everyday pieces or wear alone.",
    highlights: ["Gold vermeil", "London blue topaz", "Adjustable chain", "Hypoallergenic"],
    tags: ["gemstone", "layering"],
    daysOld: 80,
    variants: [{ size: "Adjustable 16–18\"", stock: 10 }],
  },
  {
    slug: "rose-gold-filigree-bracelet",
    name: "Rose Gold Filigree Bracelet",
    div: "lifestyle",
    cat: "jewellery",
    price: 3850,
    images: ["1611591437281-460bfbe1220a", "1573408301185-9146fe634ad0"],
    short: "Delicate filigree links in rose-gold vermeil.",
    desc: "Inspired by Mughal jaali work, delicate filigree links are cast in sterling silver and finished in rose-gold vermeil, with an extender for a perfect fit.",
    highlights: ["Rose-gold vermeil", "Sterling silver base", "Extender chain", "Gift box"],
    tags: ["bracelet", "heritage"],
    daysOld: 105,
    variants: [{ size: "6.5–7.5\"", stock: 8 }],
  },
  {
    slug: "sapphire-drop-earrings",
    name: "Sapphire Drop Earrings",
    div: "lifestyle",
    cat: "jewellery",
    price: 6200,
    images: ["1535632066927-ab7c9ab60908", "1630019852942-f89202989a59"],
    short: "Art-deco drops with lab-grown sapphires.",
    desc: "Art-deco inspired drop earrings set with lab-grown sapphires and a halo of cubic zirconia, in rhodium-plated sterling silver. A modern heirloom.",
    highlights: ["Lab-grown sapphire", "Rhodium plated", "Push-back closure", "Certificate included"],
    tags: ["earrings", "evening"],
    featured: true,
    daysOld: 42,
    variants: [{ color: "Sapphire", hex: "#2B3F86", stock: 6 }],
  },
  {
    slug: "sculpted-gold-huggies",
    name: "Sculpted Gold Huggies",
    div: "lifestyle",
    cat: "jewellery",
    price: 2950,
    images: ["1617038220319-276d3cfab638", "1611591437281-460bfbe1220a"],
    short: "Chunky molten-gold huggie hoops for every day.",
    desc: "Sculptural hoops with a molten, hand-finished texture in 18k gold-plated recycled brass. Lightweight enough to wear from morning to midnight.",
    highlights: ["18k gold plated", "Recycled brass", "Hinged closure", "Tarnish resistant"],
    tags: ["everyday", "gold"],
    daysOld: 58,
    variants: [{ size: "Pair", stock: 19 }],
  },
  {
    slug: "ambre-nuit-eau-de-parfum",
    name: "Ambre Nuit Eau de Parfum",
    div: "lifestyle",
    cat: "perfumes",
    price: 4800,
    images: ["1588405748880-12d1d2a59f75", "1519415510236-718bdfcd89c8"],
    short: "Warm amber, mitti attar and night-blooming jasmine.",
    desc: "Blended in Kannauj, Ambre Nuit opens with saffron and pink pepper, settles into night-blooming jasmine and finishes on warm amber and mitti attar — the scent of first rain on earth.",
    highlights: ["Eau de parfum", "Kannauj attar", "8–10 hour wear", "Refillable bottle"],
    tags: ["fragrance", "evening"],
    ingredients: "Top: saffron, pink pepper. Heart: jasmine sambac, rose. Base: amber, mitti attar, sandalwood.",
    featured: true,
    daysOld: 25,
    variants: [
      { volume: "50 ml", stock: 12 },
      { volume: "100 ml", price: 7200, stock: 7 },
    ],
  },
  {
    slug: "minimal-leather-strap-watch",
    name: "Minimal Leather Strap Watch",
    div: "lifestyle",
    cat: "lifestyle-accessories",
    price: 6900,
    images: ["1524592094714-0f0654e20314", "1483985988355-763728e1935b"],
    short: "A clean ivory dial on soft Italian leather.",
    desc: "A 34mm brushed rose-gold case, an ivory sunray dial and a soft Italian leather strap. Japanese quartz movement and sapphire-coated glass.",
    highlights: ["Japanese quartz", "34mm case", "Italian leather", "3 ATM water resistant"],
    tags: ["watch", "gift"],
    daysOld: 150,
    variants: [
      { color: "Taupe", hex: "#8A7462", stock: 7 },
      { color: "Black", hex: "#1A1A1A", stock: 1 },
    ],
  },
  {
    slug: "crystal-tennis-bracelet",
    name: "Crystal Tennis Bracelet",
    div: "lifestyle",
    cat: "jewellery",
    price: 5400,
    images: ["1573408301185-9146fe634ad0", "1611591437281-460bfbe1220a"],
    short: "A continuous line of brilliant-cut crystals.",
    desc: "Brilliant-cut crystals in a fine four-prong setting, finished in rhodium with a secure box clasp. The quiet sparkle every wardrobe needs.",
    highlights: ["Rhodium finish", "Box clasp", "Brilliant-cut crystals", "Gift box"],
    tags: ["bracelet", "sparkle"],
    isNew: true,
    daysOld: 2,
    variants: [{ size: '7"', stock: 9 }],
  },

];

const DIV_CODE = { fashion: "FA", beauty: "BE", lifestyle: "LS" } as const;

function variantName(v: VDef) {
  return [v.color, v.size, v.volume].filter(Boolean).join(" / ") || "Standard";
}

// Preview mode dates are relative to "today" (the SQL seed uses now() the same way)
const BASE_DATE = Math.floor(Date.now() / 86400000) * 86400000;

export const products: Product[] = pdefs.map((p, pi) => {
  const productId = u(3, pi + 1);
  const sku = `RV-${DIV_CODE[p.div]}-${String(pi + 1).padStart(3, "0")}`;
  const images: ProductImage[] = p.images.map((id, ii) => ({
    id: u(5, (pi + 1) * 10 + ii),
    url: img(id),
    alt: ii === 0 ? p.name : `${p.name} — view ${ii + 1}`,
    sortOrder: ii,
  }));
  const variants: ProductVariant[] = p.variants.map((v, vi) => ({
    id: u(4, (pi + 1) * 100 + vi + 1),
    productId,
    sku: `${sku}-${String(vi + 1).padStart(2, "0")}`,
    name: variantName(v),
    size: v.size ?? null,
    color: v.color ?? null,
    colorHex: v.hex ?? null,
    volume: v.volume ?? null,
    price: v.price ?? null,
    salePrice: v.sale === undefined ? null : v.sale,
    stock: v.stock,
    isActive: true,
  }));
  return {
    id: productId,
    slug: p.slug,
    name: p.name,
    divisionId: DIVISION_IDS[p.div],
    categoryId: catId(p.cat, p.div),
    sku,
    shortDescription: p.short,
    description: p.desc,
    price: p.price,
    salePrice: p.sale ?? null,
    ingredients: p.ingredients ?? null,
    highlights: p.highlights,
    tags: p.tags,
    isFeatured: Boolean(p.featured),
    isNew: Boolean(p.isNew),
    isActive: true,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: new Date(BASE_DATE - p.daysOld * 86400000).toISOString(),
    images,
    variants,
  };
});

/** days-ago value per product, used by the SQL seed for created_at */
export const productAgeDays: Record<string, number> = Object.fromEntries(
  pdefs.map((p, i) => [u(3, i + 1), p.daysOld]),
);

/* ------------------------------------------------------------------ */
/* Reviews (demo)                                                       */
/* ------------------------------------------------------------------ */

const reviewDefs: [slug: string, author: string, rating: number, title: string, body: string, daysAgo: number][] = [
  ["lavender-tissue-silk-saree", "Priya S.", 5, "An heirloom piece", "The zardozi on the blouse is exquisite and the tissue silk drapes so well. Felt very special.", 6],
  ["botanical-glow-face-oil", "Aditi R.", 5, "My skin has never looked better", "Two weeks in and my skin is visibly brighter. Absorbs fast and doesn't break me out.", 15],
  ["botanical-glow-face-oil", "Sana Q.", 4, "Lovely texture", "A little goes a long way. I wish the 30 ml came with a pump.", 31],
  ["argan-repair-hair-oil", "Kritika D.", 5, "Frizz, gone", "I use it as a pre-wash mask and a drop to finish. Hair feels softer and stronger.", 18],
  ["vitamin-c-brightening-serum", "Mallika J.", 4, "Visible glow", "Gentle and works well under sunscreen. No tingling.", 26],
  ["rosso-top-handle-bag", "Tanvi P.", 5, "Better than expected", "The leather is rich and the structure holds beautifully. Fits a phone, wallet and a small pouch.", 11],
  ["heirloom-pearl-strand", "Anjali B.", 5, "Wore it at my wedding", "The pearls have such a soft lustre. Knotting is impeccable.", 22],
  ["ambre-nuit-eau-de-parfum", "Diya G.", 5, "Smells like monsoon", "That mitti note is unreal. Lasts all day on me.", 8],
  ["sapphire-drop-earrings", "Zoya H.", 5, "Elegant and light", "They catch the light beautifully and don't pull on the earlobe.", 14],
  ["daily-ritual-skincare-trio", "Pooja N.", 4, "Great starter routine", "Gave this to my sister and ended up ordering one for myself.", 19],
];

export const reviews: Review[] = reviewDefs.map(([slug, author, rating, title, body, daysAgo], i) => {
  const product = products.find((p) => p.slug === slug)!;
  return {
    id: u(8, i + 1),
    productId: product.id,
    authorName: author,
    rating,
    title,
    body,
    isDemo: true,
    createdAt: new Date(BASE_DATE - daysAgo * 86400000).toISOString(),
  };
});

export const reviewAgeDays: Record<string, number> = Object.fromEntries(
  reviewDefs.map((r, i) => [u(8, i + 1), r[5]]),
);

// derive rating aggregates for preview mode
for (const p of products) {
  const rs = reviews.filter((r) => r.productId === p.id);
  p.ratingCount = rs.length;
  p.ratingAvg = rs.length ? Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 10) / 10 : 0;
}

/* ------------------------------------------------------------------ */
/* Salon & Spa                                                          */
/* ------------------------------------------------------------------ */

const serviceDefs: [slug: string, category: string, name: string, desc: string, dur: number, price: number, image: string, popular: boolean][] = [
  ["signature-cut-blow-dry", "Hair", "Signature Cut & Blow-dry", "A consultation-led precision cut tailored to your face shape and texture, finished with a glossy, bouncy blow-dry.", 60, 1800, "1562322140-8baeececf3df", true],
  ["keratin-smoothing-therapy", "Hair", "Keratin Smoothing Therapy", "Formaldehyde-free keratin treatment that smooths frizz and cuts styling time for up to four months.", 150, 6500, "1595476108010-b4d1f102b1b1", true],
  ["global-colour-gloss", "Hair", "Global Colour & Gloss", "Ammonia-free global colour with a bond-building treatment and high-shine gloss finish.", 120, 4800, "1522337360788-8b13dee7a37e", false],
  ["hydra-glow-facial", "Skin", "Hydra Glow Facial", "Deep cleanse, gentle exfoliation and hyaluronic infusion for plump, luminous skin — zero downtime.", 75, 3200, "1570172619644-dfd03ed5d881", true],
  ["gold-radiance-facial", "Skin", "24K Gold Radiance Facial", "A brightening ritual with gold-infused masks, lymphatic massage and LED therapy for special occasions.", 90, 4500, "1616394584738-fc6e612e71b9", false],
  ["bridal-couture-makeup", "Bridal", "Bridal Couture Makeup", "HD bridal makeup with hairstyling, draping and a pre-bridal trial, by our senior bridal artist.", 180, 24000, "1487412947147-5cebf100ffc2", true],
  ["party-glam-makeup", "Bridal", "Party Glam Makeup", "Camera-ready event makeup with lashes and a soft hairstyle for receptions, sangeets and evenings out.", 90, 5500, "1544005313-94ddf0286df2", false],
  ["aromatherapy-massage", "Spa", "Aromatherapy Massage", "A full-body Swedish massage with your choice of custom-blended essential oils to release tension.", 60, 3800, "1544161515-4ab6ce6db874", true],
  ["himalayan-salt-foot-ritual", "Spa", "Himalayan Salt Foot Ritual", "Warm salt soak, scrub and reflexology-inspired massage to restore tired feet.", 45, 1900, "1519415510236-718bdfcd89c8", false],
  ["gel-manicure-nail-art", "Nails", "Gel Manicure & Nail Art", "Cuticle care, shaping and long-wear gel colour with minimal or statement nail art.", 60, 1600, "1457972729786-0411a3b2b626", false],
];

export const services: Service[] = serviceDefs.map(([slug, category, name, description, durationMin, price, image, isPopular], i) => ({
  id: u(6, i + 1),
  slug,
  category,
  name,
  description,
  durationMin,
  price,
  image: img(image, 1200),
  isPopular,
  isActive: true,
}));

const sid = (slug: string) => services.find((s) => s.slug === slug)!.id;

export const stylists: Stylist[] = [
  {
    id: u(7, 1),
    slug: "meera-kapoor",
    name: "Meera Kapoor",
    title: "Creative Director, Hair",
    bio: "Trained in London and Milan, Meera leads our hair team with a focus on lived-in colour and cuts that grow out beautifully.",
    image: "/images/experts/meera-kapoor.webp",
    specialties: ["Precision cuts", "Colour", "Keratin"],
    experienceYears: 12,
    isActive: true,
    serviceIds: [sid("signature-cut-blow-dry"), sid("keratin-smoothing-therapy"), sid("global-colour-gloss")],
    workingHours: [2, 3, 4, 5, 6, 0].map((weekday) => ({ weekday, startTime: "10:00", endTime: "19:00" })),
  },
  {
    id: u(7, 2),
    slug: "ananya-rao",
    name: "Ananya Rao",
    title: "Senior Skin Therapist",
    bio: "A certified aesthetician, Ananya designs facial protocols around your skin's needs — results first, always gentle.",
    image: "/images/experts/ananya-rao.webp",
    specialties: ["Facials", "Skin analysis", "LED therapy"],
    experienceYears: 8,
    isActive: true,
    serviceIds: [sid("hydra-glow-facial"), sid("gold-radiance-facial"), sid("aromatherapy-massage")],
    workingHours: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "11:00", endTime: "20:00" })),
  },
  {
    id: u(7, 3),
    slug: "tara-sethi",
    name: "Tara Sethi",
    title: "Bridal & Editorial Makeup Artist",
    bio: "Tara's soft-glam bridal looks have featured in leading wedding journals. She believes in skin that looks like skin.",
    image: "/images/experts/tara-sethi.webp",
    specialties: ["Bridal", "HD makeup", "Draping"],
    experienceYears: 10,
    isActive: true,
    serviceIds: [sid("bridal-couture-makeup"), sid("party-glam-makeup"), sid("gel-manicure-nail-art")],
    workingHours: [0, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" })),
  },
  {
    id: u(7, 4),
    slug: "kavya-menon",
    name: "Kavya Menon",
    title: "Spa & Wellness Lead",
    bio: "Kavya blends Kerala Ayurvedic techniques with modern massage therapy for rituals that restore body and mind.",
    image: "/images/experts/kavya-menon.webp",
    specialties: ["Massage", "Ayurveda", "Nail care"],
    experienceYears: 6,
    isActive: true,
    serviceIds: [sid("aromatherapy-massage"), sid("himalayan-salt-foot-ritual"), sid("gel-manicure-nail-art"), sid("hydra-glow-facial")],
    workingHours: [0, 1, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "10:00", endTime: "19:00" })),
  },
];

/* ------------------------------------------------------------------ */
/* Marketing                                                            */
/* ------------------------------------------------------------------ */

export const promotions: Promotion[] = [
  {
    id: u(9, 1),
    eyebrow: "The Festive Edit",
    title: "Heirlooms for the season of light",
    subtitle: "Tissue silk and pre-draped sarees, up to 25% off with code FESTIVE25.",
    ctaLabel: "Shop ethnic wear",
    ctaHref: "/fashion?category=ethnic-wear",
    image: img(FASHION_IMG.rougeSaree, 1800),
    placement: "home_banner",
    divisionId: DIVISION_IDS.fashion,
    startsAt: null,
    endsAt: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: u(9, 2),
    eyebrow: "Complimentary",
    title: "Free shipping on orders above ₹2,999",
    subtitle: "Plus gift wrapping on every order.",
    ctaLabel: "Shop now",
    ctaHref: "/products",
    image: img("1483985988355-763728e1935b", 1200),
    placement: "home_strip",
    divisionId: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    sortOrder: 2,
  },
];

const aureyaPromos: [eyebrow: string, title: string, subtitle: string, cta: string, href: string, image: string, placement: Promotion["placement"]][] = [
  ["Trending", "After Dark", "Crystal gowns, sequins and high-shine bodysuits.", "Shop party wear", "/fashion?category=party-wear", FASHION_IMG.crystalGown, "division_collection"],
  ["Trending", "Heirloom Drapes", "Tissue silk and ready-to-wear bandhani sarees.", "Shop sarees", "/fashion?category=sarees", FASHION_IMG.rougeSaree, "division_collection"],
  ["Trending", "Easy Layers", "Cropped knits, plunge tops and embroidered hoodies.", "Shop tops", "/fashion?category=tops", FASHION_IMG.cardigan, "division_collection"],
  ["Trending", "Resort Whites", "Draped ivory sets for sun-soaked evenings.", "Shop co-ords", "/fashion?category=co-ord-sets", FASHION_IMG.drapedCoord, "division_collection"],
  ["The AUREYA Journal", "Woven by hand, worn with heart.", "Every AUREYA saree is woven and finished by hand — tissue silks with gold borders and blouses embellished in zardozi in our Mumbai atelier.", "Explore Ethnic Wear", "/fashion?category=ethnic-wear", AUREYA_IMG.editorial, "division_editorial"],
];

promotions.push(
  ...aureyaPromos.map(([eyebrow, title, subtitle, ctaLabel, ctaHref, image, placement], i) => ({
    id: u(9, 10 + i),
    eyebrow,
    title,
    subtitle,
    ctaLabel,
    ctaHref,
    image: img(image, 1600),
    placement,
    divisionId: DIVISION_IDS.fashion,
    startsAt: null,
    endsAt: null,
    isActive: true,
    sortOrder: 10 + i,
  })),
);

export const coupons: Coupon[] = [
  {
    id: u(10, 1),
    code: "WELCOME10",
    description: "10% off your first order (max ₹1,000)",
    discountType: "percent",
    discountValue: 10,
    minSubtotal: 1500,
    maxDiscount: 1000,
    divisionId: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  },
  {
    id: u(10, 2),
    code: "FESTIVE25",
    description: "25% off Fashion above ₹5,000 (max ₹4,000)",
    discountType: "percent",
    discountValue: 25,
    minSubtotal: 5000,
    maxDiscount: 4000,
    divisionId: DIVISION_IDS.fashion,
    startsAt: null,
    endsAt: null,
    usageLimit: 500,
    usedCount: 0,
    isActive: true,
  },
  {
    id: u(10, 3),
    code: "GLOW500",
    description: "₹500 off Beauty & Care above ₹2,500",
    discountType: "fixed",
    discountValue: 500,
    minSubtotal: 2500,
    maxDiscount: null,
    divisionId: DIVISION_IDS.beauty,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
  },
];

/* ------------------------------------------------------------------ */
/* Access control                                                       */
/* ------------------------------------------------------------------ */

export const permissions = [
  ["dashboard.view", "View the admin dashboard"],
  ["divisions.manage", "Create and configure business divisions"],
  ["products.manage", "Create, edit and delete products"],
  ["inventory.manage", "Adjust stock and view inventory"],
  ["orders.view", "View orders"],
  ["orders.manage", "Update fulfilment, cancel and refund orders"],
  ["appointments.manage", "Manage appointments, services, stylists and availability"],
  ["customers.view", "View customer profiles"],
  ["marketing.manage", "Manage promotions, coupons and newsletter"],
  ["reports.view", "View reports and analytics"],
  ["settings.manage", "Manage staff roles and platform settings"],
] as const;

export type PermissionKey = (typeof permissions)[number][0];

export const roles: { key: string; name: string; division: keyof typeof DIVISION_IDS | null; perms: PermissionKey[] | "*" }[] = [
  { key: "super_admin", name: "Super Admin", division: null, perms: "*" },
  { key: "fashion_manager", name: "Fashion Manager", division: "fashion", perms: ["dashboard.view", "products.manage", "inventory.manage", "orders.view", "orders.manage", "reports.view"] },
  { key: "beauty_manager", name: "Beauty Manager", division: "beauty", perms: ["dashboard.view", "products.manage", "inventory.manage", "orders.view", "orders.manage", "reports.view"] },
  { key: "salon_manager", name: "Salon Manager", division: "salon", perms: ["dashboard.view", "appointments.manage", "reports.view", "customers.view"] },
  { key: "lifestyle_manager", name: "Lifestyle Manager", division: "lifestyle", perms: ["dashboard.view", "products.manage", "inventory.manage", "orders.view", "orders.manage"] },
  { key: "inventory_manager", name: "Inventory Manager", division: null, perms: ["dashboard.view", "inventory.manage"] },
  { key: "order_manager", name: "Order Manager", division: null, perms: ["dashboard.view", "orders.view", "orders.manage", "customers.view"] },
  { key: "customer", name: "Customer", division: null, perms: [] },
];

export const DEMO_PASSWORD = "Ravantra@123";

export const adminUsers = [
  { id: u(17, 1), email: "superadmin@ravantra.test", name: "Riya Malhotra", role: "super_admin" },
  { id: u(17, 2), email: "fashion@ravantra.test", name: "Aarav Desai", role: "fashion_manager" },
  { id: u(17, 3), email: "beauty@ravantra.test", name: "Naina Iyer", role: "beauty_manager" },
  { id: u(17, 4), email: "salon@ravantra.test", name: "Farah Sheikh", role: "salon_manager" },
  { id: u(17, 5), email: "lifestyle@ravantra.test", name: "Ira Banerjee", role: "lifestyle_manager" },
  { id: u(17, 6), email: "inventory@ravantra.test", name: "Kabir Joshi", role: "inventory_manager" },
  { id: u(17, 7), email: "orders@ravantra.test", name: "Dev Kulkarni", role: "order_manager" },
] as const;

/* ------------------------------------------------------------------ */
/* Demo customers, orders, appointments                                 */
/* ------------------------------------------------------------------ */

const customerDefs: [name: string, email: string, phone: string, city: string, state: string, pin: string, joinedDaysAgo: number][] = [
  ["Ananya Sharma", "ananya@ravantra.test", "+91 98200 11001", "Mumbai", "Maharashtra", "400050", 230],
  ["Ishita Mehra", "ishita@ravantra.test", "+91 98110 22002", "New Delhi", "Delhi", "110016", 210],
  ["Priya Nair", "priya@ravantra.test", "+91 98450 33003", "Bengaluru", "Karnataka", "560038", 190],
  ["Sana Qureshi", "sana@ravantra.test", "+91 98300 44004", "Kolkata", "West Bengal", "700019", 170],
  ["Rhea Kapadia", "rhea@ravantra.test", "+91 98250 55005", "Ahmedabad", "Gujarat", "380015", 140],
  ["Aditi Rao", "aditi@ravantra.test", "+91 98490 66006", "Hyderabad", "Telangana", "500034", 120],
  ["Tanvi Patil", "tanvi@ravantra.test", "+91 98220 77007", "Pune", "Maharashtra", "411001", 90],
  ["Meher Arora", "meher@ravantra.test", "+91 98140 88008", "Chandigarh", "Punjab", "160017", 60],
  ["Diya Ghosh", "diya@ravantra.test", "+91 98310 99009", "Kolkata", "West Bengal", "700029", 35],
  ["Zoya Hussain", "zoya@ravantra.test", "+91 98190 10010", "Mumbai", "Maharashtra", "400058", 14],
];

export const demoCustomers = customerDefs.map(([name, email, phone, city, state, pin, joined], i) => ({
  id: u(11, i + 1),
  fullName: name,
  email,
  phone,
  joinedDaysAgo: joined,
  address: {
    id: u(19, i + 1),
    label: "Home",
    fullName: name,
    phone,
    line1: `${12 + i * 7}, ${["Carter Road", "Hauz Khas Enclave", "Indiranagar 2nd Stage", "Ballygunge Place", "Satellite Road", "Jubilee Hills", "Koregaon Park", "Sector 9", "Gariahat Road", "Lokhandwala"][i]}`,
    line2: null,
    city,
    state,
    postalCode: pin,
    country: "India",
    isDefault: true,
  },
}));

/** Tiny seeded PRNG (mulberry32) so seed.sql and preview mode always agree */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoOrderSeed {
  id: string;
  orderNumber: string;
  customerIndex: number;
  daysAgo: number;
  hour: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentStatus: "pending" | "successful" | "failed" | "refunded";
  couponCode: string | null;
  items: { id: string; productId: string; variantId: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export const SHIPPING = { freeAbove: 2999, flat: 149 } as const;

export function unitPriceOf(product: Product, variant: ProductVariant) {
  if (variant.price != null) return variant.salePrice ?? variant.price;
  return variant.salePrice ?? product.salePrice ?? product.price;
}

export const demoOrders: DemoOrderSeed[] = (() => {
  const r = rng(20261105);
  const out: DemoOrderSeed[] = [];
  const shoppable = products;
  const count = 64;
  for (let i = 0; i < count; i++) {
    // spread over ~210 days, denser toward the present (growth curve)
    const t = Math.pow(r(), 1.6);
    const daysAgo = Math.max(0, Math.round(t * 210));
    const customerIndex = Math.floor(r() * demoCustomers.length);
    const lines = 1 + Math.floor(r() * 3);
    const items: DemoOrderSeed["items"] = [];
    const used = new Set<string>();
    for (let l = 0; l < lines; l++) {
      const p = shoppable[Math.floor(r() * shoppable.length)];
      const v = p.variants[Math.floor(r() * p.variants.length)];
      if (used.has(v.id)) continue;
      used.add(v.id);
      items.push({
        id: u(13, i * 10 + l + 1),
        productId: p.id,
        variantId: v.id,
        quantity: r() > 0.85 ? 2 : 1,
        unitPrice: unitPriceOf(p, v),
      });
    }
    const subtotal = items.reduce((a, it) => a + it.unitPrice * it.quantity, 0);
    const useCoupon = r() > 0.8 && subtotal >= 1500;
    const discount = useCoupon ? Math.min(Math.round(subtotal * 0.1), 1000) : 0;
    const shipping = subtotal - discount >= SHIPPING.freeAbove ? 0 : SHIPPING.flat;
    let status: DemoOrderSeed["status"];
    let paymentStatus: DemoOrderSeed["paymentStatus"];
    const roll = r();
    if (daysAgo <= 2) {
      status = roll < 0.4 ? "pending" : roll < 0.75 ? "confirmed" : "processing";
      paymentStatus = status === "pending" ? (roll < 0.15 ? "failed" : "pending") : "successful";
    } else if (daysAgo <= 7) {
      status = roll < 0.3 ? "processing" : roll < 0.85 ? "shipped" : "delivered";
      paymentStatus = "successful";
    } else {
      status = roll < 0.88 ? "delivered" : roll < 0.95 ? "cancelled" : "refunded";
      paymentStatus = status === "delivered" ? "successful" : status === "refunded" ? "refunded" : "failed";
    }
    out.push({
      id: u(12, i + 1),
      orderNumber: `RV-DEMO-${String(1001 + i)}`,
      customerIndex,
      daysAgo,
      hour: 9 + Math.floor(r() * 13),
      status,
      paymentStatus,
      couponCode: useCoupon ? "WELCOME10" : null,
      items,
      subtotal,
      discount,
      shipping,
      total: subtotal - discount + shipping,
    });
  }
  return out.sort((a, b) => b.daysAgo - a.daysAgo);
})();

export interface DemoAppointmentSeed {
  id: string;
  reference: string;
  customerIndex: number;
  serviceId: string;
  stylistId: string;
  /** day offset from today (negative = past) in Asia/Kolkata */
  dayOffset: number;
  /** local start time HH:MM in Asia/Kolkata */
  startTime: string;
  durationMin: number;
  price: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
}

export const demoAppointments: DemoAppointmentSeed[] = (() => {
  const r = rng(424242);
  const out: DemoAppointmentSeed[] = [];
  const startSlots = ["10:00", "11:30", "13:00", "14:30", "16:00"];
  let n = 0;
  for (let dayOffset = -56; dayOffset <= 14; dayOffset += 2) {
    const perDay = dayOffset > 0 ? 1 : 1 + Math.floor(r() * 2);
    const takenStylists = new Set<string>();
    for (let k = 0; k < perDay; k++) {
      const stylist = stylists[Math.floor(r() * stylists.length)];
      if (takenStylists.has(stylist.id)) continue;
      takenStylists.add(stylist.id);
      const serviceId = stylist.serviceIds[Math.floor(r() * stylist.serviceIds.length)];
      const service = services.find((s) => s.id === serviceId)!;
      // long services always start early so they end inside working hours
      const startTime = service.durationMin > 120 ? "11:00" : startSlots[Math.floor(r() * startSlots.length)];
      const roll = r();
      const status: DemoAppointmentSeed["status"] =
        dayOffset > 0
          ? roll < 0.6 ? "confirmed" : "pending"
          : roll < 0.8 ? "completed" : roll < 0.92 ? "cancelled" : "no_show";
      n++;
      out.push({
        id: u(14, n),
        reference: `APT-DEMO-${String(500 + n)}`,
        customerIndex: Math.floor(r() * demoCustomers.length),
        serviceId,
        stylistId: stylist.id,
        dayOffset,
        startTime,
        durationMin: service.durationMin,
        price: service.price,
        status,
      });
    }
  }
  return out;
})();

export const newsletterDemo = [
  "hello.reader@ravantra.test",
  "style.notes@ravantra.test",
  "glow.club@ravantra.test",
];
