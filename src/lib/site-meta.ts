/** Branding & meta bersama untuk Toko Cung World (bukan Lovable). */

export const SITE = {
  name: "Toko Cung World",
  shortName: "Toko Cung",
  url: "https://world.tokocung.com",
  locale: "id_ID",
  lang: "id",
  themeColor: "#c41e3a",
  description:
    "Dunia virtual 3D Toko Cung: jelajahi toko, ngobrol dengan pemain lain, dan belanja sungguhan lewat QRIS atau Virtual Account.",
  ogImage: "/og-image.jpg",
  twitterHandle: "@tokocung",
} as const;

export function pageMeta(opts: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
}) {
  const description = opts.description ?? SITE.description;
  const image = opts.image ?? SITE.ogImage;
  const url = opts.path ? `${SITE.url}${opts.path}` : SITE.url;
  return [
    { title: opts.title },
    { name: "description", content: description },
    { name: "author", content: "Toko Cung" },
    { name: "theme-color", content: SITE.themeColor },
    { name: "application-name", content: SITE.name },
    { property: "og:site_name", content: SITE.name },
    { property: "og:locale", content: SITE.locale },
    { property: "og:type", content: "website" },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image.startsWith("http") ? image : `${SITE.url}${image}` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: description },
    {
      name: "twitter:image",
      content: image.startsWith("http") ? image : `${SITE.url}${image}`,
    },
  ];
}

export const siteIconLinks = [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
] as const;
