// Single fetch of the compiled content JSON (produced by scripts/build-content.mjs),
// cached for the lifetime of the page so every module can await it cheaply.
let cache = null;

export async function getContent() {
  if (cache) return cache;
  const res = await fetch('/data/content.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load content.json: ${res.status}`);
  cache = await res.json();
  return cache;
}
