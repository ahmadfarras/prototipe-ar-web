export function buildProductQrUrl(baseUrl, slug) {
  if (!URL.canParse(baseUrl)) {
    throw new Error(`Base URL is not a valid URL: ${baseUrl}`)
  }
  const base = new URL(baseUrl)
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new Error(`Base URL must be http(s): ${baseUrl}`)
  }
  return new URL(`/p/${slug}`, base.origin).href
}
