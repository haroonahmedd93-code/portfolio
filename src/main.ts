/**
 * Boot order (per 06-build-plan): fonts → lenis → gsap → sections → gl
 */
import './styles/index.css';
import './core/gsap';
import './core/lenis';
import { ScrollTrigger } from './core/gsap';
import { revealLines } from './core/reveal';
import { initNav } from './ui/nav';
import { initCopyEmail, initLogoInk, initRollLinks } from './ui/micro';
import { initIntro } from './sections/intro';
import { initApproach } from './sections/approach';
import { initWork } from './sections/work';
import { initAbout, initOutro } from './sections/about';
import { initCase } from './sections/case';

document.documentElement.classList.replace('no-js', 'js');

const page = document.body.dataset.page;

async function boot() {
  initRollLinks();
  initCopyEmail();
  initLogoInk();
  initNav();

  if (page === 'home') {
    initIntro(); // async: the wall loads its own chunk
    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal-lines]')) revealLines(el);
    initWork();
    initAbout();
    initOutro();
    await initApproach(); // async: scenes load their own chunks
  } else if (page === 'case') {
    initCase();
    initOutro();
  }
  ScrollTrigger.refresh();
}

document.fonts.ready.then(boot);

export {};
