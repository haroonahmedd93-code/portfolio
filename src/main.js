import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import { renderNav } from './modules/nav.js';
import { initRevealAnimations } from './modules/revealAnimations.js';

// Shared boot sequence for every page: nav/footer render, then generic scroll reveals.
// Page-specific modules (hero scene, project grid, project detail, contact form) are
// imported directly by the page that needs them, so nothing unused ships on other pages.
async function boot() {
  await renderNav();
  initRevealAnimations();
}

boot();
