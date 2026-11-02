const FALLBACK_SITE_URL = "http://localhost:3000";

/**
 * A URL pública do site, base absoluta do `og:image`. Se `BETTER_AUTH_URL`
 * faltar ou vier sem protocolo (ex.: `augusto.up.railway.app`), cai em
 * localhost em vez de derrubar o layout raiz com `Invalid URL`.
 */
export function siteUrl(value = process.env.BETTER_AUTH_URL): URL {
  try {
    return new URL(value || FALLBACK_SITE_URL);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}
