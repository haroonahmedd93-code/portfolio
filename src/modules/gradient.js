const VARIANTS = 6;

/**
 * Deterministically map a project slug (or fallback index) to one of the
 * CSS gradient placeholder classes (.grad-1 .. .grad-6) defined in
 * components.css. Used instead of real/sourced project imagery.
 */
export function gradientClass(slug, fallbackIndex = 0) {
  let n = fallbackIndex;
  if (slug) {
    n = 0;
    for (let i = 0; i < slug.length; i += 1) {
      n = (n * 31 + slug.charCodeAt(i)) % VARIANTS;
    }
  }
  const variant = (Math.abs(n) % VARIANTS) + 1;
  return `grad-${variant}`;
}
