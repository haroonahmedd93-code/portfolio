import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(ScrollTrigger, InertiaPlugin);
gsap.ticker.lagSmoothing(0); // G2 — Lenis drives the clock; no lag catch-up jumps

gsap.defaults({ ease: 'power3.out', duration: 0.6 });

export { gsap, ScrollTrigger, InertiaPlugin };
