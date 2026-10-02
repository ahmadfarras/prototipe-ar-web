import { isValidSlug } from './product'

const PRODUCT_PATH_PREFIX = '/p/'
const MAX_LINK_LENGTH = 2048

export function buildProductPath(slug: string): string {
  return `${PRODUCT_PATH_PREFIX}${slug}`
}

export function parseProductLink(text: string): string | null {
  const candidate = text.trim()
  if (candidate.length === 0 || candidate.length > MAX_LINK_LENGTH) return null
  if (isValidSlug(candidate)) return candidate

  const url = parseHttpUrl(candidate)
  if (!url || !url.pathname.startsWith(PRODUCT_PATH_PREFIX)) return null

  const slug = url.pathname.slice(PRODUCT_PATH_PREFIX.length)
  return isValidSlug(slug) ? slug : null
}

function parseHttpUrl(text: string): URL | null {
  if (!URL.canParse(text)) return null
  const url = new URL(text)
  return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
}
