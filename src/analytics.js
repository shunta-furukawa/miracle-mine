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

/* Durable counts. Vercel's Hobby plan exposes neither UTM dimensions nor custom events,
   so the funnel is counted in our own database: one row per day, entry point and event. */
export function reportTally(event, source) {
 try {
  const payload = JSON.stringify({event, source});
  if (navigator.sendBeacon?.('/api/ranking?action=tally', new Blob([payload], {type: 'application/json'}))) return;
  fetch('/api/ranking?action=tally', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: payload, keepalive: true}).catch(() => {});
 } catch {}
}
