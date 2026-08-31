import { jsonLdScripts } from '@/lib/seo';

/** Inyecta Organization + WebSite schema.org en el documento. */
export function JsonLd() {
  const graphs = jsonLdScripts();

  return (
    <>
      {graphs.map((graph) => (
        <script
          key={String(graph['@type'])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(graph).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
