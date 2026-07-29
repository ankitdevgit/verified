/**
 * Structured data. `<` is escaped to its unicode form because `JSON.stringify`
 * does not sanitise strings for XSS, and review text is user-supplied.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
