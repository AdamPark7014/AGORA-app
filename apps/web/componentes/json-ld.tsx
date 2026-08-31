import { jsonLdScripts } from '@/lib/seo';

/** Inyecta schema.org (Organization, WebSite, WebApplication, FAQPage). */
export function JsonLd() {
  const graphs = jsonLdScripts();

  return (
    <>
      {graphs.map((graph, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(graph).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
