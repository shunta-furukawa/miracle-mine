/* Vercel Web Analytics custom events. Counts only: no names, IDs, keys or free text are ever sent.
   window.va is the queue stub in index.html, so calls made before the script loads are not lost. */
export function trackEvent(name, data = null) {
 try { window.va?.('event', data ? {name, data} : {name}); } catch {}
}
/* Where this visit came from, for the funnel: a campaign slug, 'share', or 'direct'. */
export const SOURCE_SLUG = /^[a-z][a-z-]{0,23}$/;
export function entrySource(href) {
 try {
  const params = new URL(href).searchParams, via = params.get('via');
  if (via === 'share') return 'share';
  for (const value of [via, params.get('utm_source')]) if (value && SOURCE_SLUG.test(value)) return value;
 } catch {}
 return 'direct';
}
