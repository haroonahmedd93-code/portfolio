/**
 * Boot order (per 06-build-plan): fonts → lenis → gsap → sections → gl
 * Stage 1 only marks the document as JS-enabled. Later stages add the rest.
 */
import './styles/index.css';

document.documentElement.classList.replace('no-js', 'js');

export {};
