/**
 * Boot order (per 06-build-plan): fonts → lenis → gsap → sections → gl
 */
import './styles/index.css';
import './core/gsap';
import './core/lenis';
import { initIntro } from './sections/intro';

document.documentElement.classList.replace('no-js', 'js');

const page = document.body.dataset.page;

if (page === 'home') {
  initIntro();
}

export {};
