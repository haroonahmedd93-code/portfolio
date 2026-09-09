// Reads Markdown/JSON from /content (edited via Decap CMS or by hand) and compiles it
// into a single static JSON file the client fetches at runtime: public/data/content.json.
// Runs automatically before `vite` and `vite build` (see package.json pre* scripts).
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const contentDir = join(root, 'content');
const outDir = join(root, 'public', 'data');
const outFile = join(outDir, 'content.json');

function readMarkdownDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(dir, f), 'utf-8');
      const { data, content } = matter(raw);
      return { ...data, body: content.trim() };
    });
}

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const site = readJson(join(contentDir, 'settings', 'site.json'), {});
const aboutFiles = readMarkdownDir(join(contentDir, 'about'));
const about = aboutFiles[0] || {};
const projects = readMarkdownDir(join(contentDir, 'projects')).sort(
  (a, b) => (a.order ?? 999) - (b.order ?? 999)
);
const journalDir = join(contentDir, 'journal');
const journal = existsSync(journalDir)
  ? readMarkdownDir(journalDir).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  : [];

const compiled = { site, about, projects, journal, generatedAt: new Date().toISOString() };

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(compiled, null, 2));

console.log(`[build-content] wrote ${projects.length} project(s) to public/data/content.json`);
