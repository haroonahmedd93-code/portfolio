import { getContent } from './content.js';

function linkMarkup(item, currentPath) {
  const isCurrent = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
  return `<a href="${item.href}"${isCurrent ? ' aria-current="page"' : ''}>${item.label}</a>`;
}

export async function renderNav() {
  const navEl = document.getElementById('site-nav');
  const footerEl = document.getElementById('site-footer');
  if (!navEl && !footerEl) return;

  const { site } = await getContent();
  const currentPath = window.location.pathname;

  if (navEl) {
    navEl.classList.add('site-nav');
    navEl.innerHTML = `
      <a class="site-nav__brand" href="/">${site.name || '[YOUR_NAME]'}</a>
      <nav aria-label="Primary">
        <ul class="site-nav__links">
          ${(site.nav || []).map((item) => `<li>${linkMarkup(item, currentPath)}</li>`).join('')}
        </ul>
      </nav>
    `;
  }

  if (footerEl) {
    const year = new Date().getFullYear();
    footerEl.innerHTML = `
      <p>© ${year} ${site.name || '[YOUR_NAME]'}. Built with vanilla JS, GSAP &amp; Three.js.</p>
      <div class="site-footer__social">
        ${(site.social || []).map((s) => `<a href="${s.url}">${s.label}</a>`).join('')}
      </div>
    `;
    footerEl.classList.add('site-footer');
  }
}
