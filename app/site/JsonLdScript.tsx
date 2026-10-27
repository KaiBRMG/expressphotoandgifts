/** Structured data for search, as the script a page carries. `<` is escaped so nothing in the data can close the tag early. */
export function JsonLdScript({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
