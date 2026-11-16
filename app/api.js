// api.js — the only module that talks to the network.
// Every read goes to make.fun's public API with GET. Answers are kept in a
// small in-memory cache keyed by URL, each with the ETag the API sent; a
// repeat read revalidates with If-None-Match and reuses the cached body on a
// 304, so views cost one conditional request instead of a full download.
// Identical reads that overlap share one in-flight request.

const ORIGIN = 'https://make.fun';

const cache = new Map(); // url -> { etag: string | null, body: unknown }
const pending = new Map(); // url -> Promise<unknown>

export function apiUrl(path) {
  return path.startsWith('http') ? path : ORIGIN + path;
}

// The API hands back some URLs root-relative (avatars, profile pictures).
// Resolve those against the API's own origin; absolute ones pass through.
export function assetUrl(url) {
  if (!url) return '';
  if (url.startsWith('/')) return ORIGIN + url;
  return url;
}

async function fetchJson(url) {
  const hit = cache.get(url);
  const headers = { accept: 'application/json' };
  if (hit && hit.etag) headers['if-none-match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) return hit.body;
  if (!res.ok) {
    const err = new Error('make.fun API answered ' + res.status + ' for ' + url);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('etag'), body });
  return body;
}

export function api(path) {
  const url = apiUrl(path);
  let p = pending.get(url);
  if (!p) {
    p = fetchJson(url).finally(() => pending.delete(url));
    pending.set(url, p);
  }
  return p;
}

// Drop every cached answer (used by the manual refresh control).
export function clearCache() {
  cache.clear();
}
