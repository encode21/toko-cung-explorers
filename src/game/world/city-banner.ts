import { z } from "zod";

const ApiBanner = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().catch("Banner"),
  image: z.string(),
  type: z.string().nullable().optional(),
  sort_order: z.coerce.number().int().nonnegative().catch(0),
});

const BannerEnvelope = z.object({
  status: z.literal(true),
  data: z.array(ApiBanner),
});

export interface CityPopupBanner {
  id: number;
  name: string;
  imageUrl: string;
  sortOrder: number;
}

const ACTIVE_BANNER_FEED = "https://cashier.tokocung.com/api/banner";

function publicImageUrl(value: string) {
  const url = value.trim();
  return /^https:\/\//i.test(url) ? url : null;
}

/** The public API already applies status=active; the world additionally selects popup banners only. */
export function parseActivePopupBanners(value: unknown): CityPopupBanner[] {
  const parsed = BannerEnvelope.safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.data
    .filter((banner) => banner.type?.trim().toLowerCase() === "popup")
    .flatMap((banner) => {
      const imageUrl = publicImageUrl(banner.image);
      return imageUrl
        ? [{ id: banner.id, name: banner.name, imageUrl, sortOrder: banner.sort_order }]
        : [];
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** Public, read-only campaign feed. Fetching in the browser avoids coupling city art to the world server. */
export async function loadActivePopupBanners(signal?: AbortSignal) {
  const response = await fetch(ACTIVE_BANNER_FEED, {
    headers: { Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) return [];
  return parseActivePopupBanners(await response.json());
}
