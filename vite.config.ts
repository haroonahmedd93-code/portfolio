import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { projects } from './src/content';
import { renderHome, renderCase, renderHead, homeMeta, caseMeta } from './src/render/html';

/**
 * Renders `content.ts` into the HTML shells at build/dev time.
 * Shells contain `<!--@head-->` and `<!--@body-->` markers.
 */
function renderContent(): Plugin {
  return {
    name: 'render-content',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const m = ctx.path.match(/^\/cases\/([a-z0-9-]+)\//);
        if (m) {
          const p = projects.find((x) => x.slug === m[1]);
          if (!p) throw new Error(`No project with slug "${m[1]}" in content.ts`);
          return html.replace('<!--@head-->', renderHead(caseMeta(p))).replace('<!--@body-->', renderCase(p));
        }
        return html.replace('<!--@head-->', renderHead(homeMeta())).replace('<!--@body-->', renderHome());
      },
    },
  };
}

const input: Record<string, string> = { main: resolve(__dirname, 'index.html') };
for (const p of projects) input[`case-${p.slug}`] = resolve(__dirname, `cases/${p.slug}/index.html`);

export default defineConfig({
  plugins: [renderContent()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input,
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap', 'gsap/ScrollTrigger', 'gsap/InertiaPlugin'],
          lenis: ['lenis'],
        },
      },
    },
    assetsInlineLimit: 0,
  },
  server: { port: 5173 },
});
