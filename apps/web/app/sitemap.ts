import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://udlagora.com';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/terminos`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacidad`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
