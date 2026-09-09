# [YOUR_NAME] — Portfolio

A cinematic, production-ready personal portfolio: vanilla HTML/CSS/JS, built with Vite,
animated with GSAP + ScrollTrigger, and featuring a restrained Three.js/WebGL hero scene.
Content is edited through [Decap CMS](https://decapcms.org) at `/admin`, authenticated
with GitHub OAuth, and every edit lands as a real commit in this repository — GitHub stays
the single source of truth. No database, no React/Vue/Next, no Tailwind.

Replace every `[PLACEHOLDER]` (name, role, email, GitHub username/repo, site URL) before
launch — see **Placeholders to replace** below for the full list.

---

## 1. Local setup

```bash
git clone https://github.com/[GITHUB_USERNAME]/[GITHUB_REPOSITORY].git
cd [GITHUB_REPOSITORY]
npm install
```

Copy the env template (only needed if you want to test the CMS OAuth flow locally):

```bash
cp .env.example .env
```

## 2. Development commands

```bash
npm run dev            # starts Vite at http://localhost:5173
npm run content:build  # regenerates public/data/content.json from /content (also runs automatically before dev/build)
npm run build           # production build to dist/
npm run preview         # serve the production build locally
```

The dev/build scripts always regenerate `public/data/content.json` first, so editing any
file in `content/` and restarting `npm run dev` (or just reloading, since the file is
fetched at runtime) is enough to see changes.

## 3. Production build

```bash
npm run build
npm run preview
```

`npm run build` runs `scripts/build-content.mjs` (compiles `content/**` into
`public/data/content.json`) and then `vite build`, emitting a fully static site into
`dist/` — five HTML entry points (home, projects index, project detail, about, contact),
hashed JS/CSS assets, and the `/admin` CMS folder copied through untouched. The only
non-static pieces are the two serverless functions under `api/`, which Vercel deploys
separately from the static output.

## 4. GitHub repository setup

1. Create a new repository on GitHub, e.g. `[GITHUB_USERNAME]/[GITHUB_REPOSITORY]`.
2. Push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/[GITHUB_USERNAME]/[GITHUB_REPOSITORY].git
   git push -u origin main
   ```
3. Make sure everyone who should be able to publish content through `/admin` is added as
   a **collaborator** on the repo (Settings → Collaborators). Decap CMS's GitHub backend
   relies entirely on GitHub's own permission model — anyone who isn't a collaborator can
   authenticate but GitHub will reject their commits.

## 5. Vercel deployment setup

1. In [Vercel](https://vercel.com), click **Add New → Project** and import this GitHub repo.
2. Framework preset: choose **Vite** (or "Other" — `vercel.json` already sets the build
   command and output directory explicitly, so either works).
3. Leave the default build command (`npm run build`) and output directory (`dist`) as
   configured in `vercel.json`.
4. Add the environment variables from step 7 below, then deploy.
5. Every push to `main` (including commits made by Decap CMS through `/admin`) triggers a
   new production deployment automatically once the GitHub integration is connected.

## 6. GitHub OAuth app setup for `/admin`

Decap CMS needs a GitHub OAuth App (not a GitHub App) so it can open a login popup and
exchange a code for a token through this repo's `api/auth.js` / `api/callback.js`
serverless functions.

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name**: anything, e.g. `[YOUR_NAME] Portfolio CMS`
   - **Homepage URL**: `[SITE_URL]` (your production Vercel URL, e.g. `https://your-site.vercel.app`)
   - **Authorization callback URL**: `[SITE_URL]/api/callback`
3. Click **Register application**, then **Generate a new client secret**.
4. Copy the **Client ID** and **Client Secret** — you'll paste them into Vercel next.

If you also want to test the CMS from `localhost`, create a *second* OAuth App with:
- Homepage URL: `http://localhost:5173`
- Callback URL: `http://localhost:5173/api/callback`

(Vite's dev server doesn't run serverless functions, so local CMS testing normally means
running `vercel dev` instead of `npm run dev` — see the note at the end of this section.)

## 7. Required Vercel environment variables

Set these under **Vercel Project → Settings → Environment Variables** (Production, and
Preview/Development if you want CMS auth to work on preview deployments too):

| Variable | Value |
|---|---|
| `GITHUB_OAUTH_CLIENT_ID` | Client ID from the OAuth App you created above |
| `GITHUB_OAUTH_CLIENT_SECRET` | Client Secret from the OAuth App you created above |
| `SITE_URL` | Your production URL, e.g. `https://your-site.vercel.app` (must match the OAuth App's homepage/callback host) |
| `GITHUB_REPO_OWNER` | `[GITHUB_USERNAME]` (informational, used for documentation/consistency) |
| `GITHUB_REPO_NAME` | `[GITHUB_REPOSITORY]` (informational) |

Never commit real values — `.env` is git-ignored, and `.env.example` only documents the
variable names.

To exercise the full OAuth flow locally, install the Vercel CLI (`npm i -g vercel`) and
run `vercel dev` instead of `npm run dev`; it serves both the static site and the `api/`
functions together, using a local `.env`.

## 8. Editing content through the CMS

1. Visit `[SITE_URL]/admin`.
2. Click **Login with GitHub** and authorize the OAuth App. Only GitHub accounts that are
   collaborators on the repository will be able to save changes.
3. You'll see four collections:
   - **Projects** — add/edit/reorder case studies (title, role, year, tools, tags,
     featured flag, cover + gallery images, challenge/solution/outcomes, links, body).
   - **About** — bio, portrait, skills list, experience timeline.
   - **Site Settings** — name, role, statement, email, nav, social links, services, SEO.
   - **Writing** — optional journal/blog entries.
4. Images you upload in the CMS are saved to `public/images/uploads/` and referenced by
   path automatically.
5. Click **Publish** — Decap commits the change directly to the `main` branch of this repo.

## 9. How CMS edits reach the live site

Every save in `/admin` is a real Git commit against `content/` (and `public/images/uploads/`
for media), made through the GitHub REST API using the token issued by `api/callback.js`.
That commit lands on `main` exactly like a commit you'd push yourself. Vercel's GitHub
integration watches the repo and immediately starts a new production build, which reruns
`scripts/build-content.mjs` to regenerate `public/data/content.json` from the updated
Markdown/JSON, then rebuilds the static site — so a CMS save is live within one deploy
cycle, no database and no extra webhook wiring required.

---

## Placeholders to replace

Search the repo for these and replace with your real values:

- `[YOUR_NAME]`, `[YOUR_ROLE]`, `[YOUR_EMAIL]` — used across HTML `<title>`/meta tags and `content/settings/site.json`
- `[GITHUB_USERNAME]`, `[GITHUB_REPOSITORY]` — used in `public/admin/config.yml`, `README.md`, and `content/settings/site.json`'s social links
- `[SITE_URL]` — used in `public/admin/config.yml` (`backend.base_url`) and as the `SITE_URL` env var
- `public/resume.pdf` — replace the placeholder file with your real résumé
- `public/images/*.svg` placeholders and `content/projects/*.md` sample entries — replace with your real project images and case studies

## Project structure

See the file tree in the project introduction, or browse `src/`, `content/`, `public/`,
and `api/` directly — each has a one-line purpose comment at the top of its key files.

## Accessibility & performance notes

- Semantic landmarks (`header`, `main`, `footer`, `nav`), a skip link, and visible focus
  rings on every interactive element.
- The hero's WebGL scene is feature-detected (`src/three/capability.js`): it never loads
  if `prefers-reduced-motion` is set, WebGL is unavailable, or the device looks low-power
  (≤2 cores, `navigator.connection.saveData`, or a slow connection) — a static gradient
  fallback (`#hero-fallback`) is shown instead, and the module itself is dynamically
  `import()`ed so its code never ships to those users.
- GSAP ScrollTrigger reveals are skipped entirely under reduced motion; content is simply
  visible immediately.
- Images use explicit `width`/`height` to prevent layout shift and `loading="lazy"` below
  the fold.
- All JS is loaded as native ES modules (`type="module"`); there is no framework runtime.
