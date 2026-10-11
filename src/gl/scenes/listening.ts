/**
 * LISTENING — 2D canvas constellation (A3): big soft nodes drift, thin lines
 * connect to a centre node, elastic pulse on enter, soft bloom.
 */
import { gsap } from '../../core/gsap';
import { dprCap, type Scene } from './types';

interface Node {
  x: number; // 0..1 of width
  y: number;
  r: number; // px
  vx: number;
  vy: number;
  phase: number;
  big: boolean;
  scale: number; // elastic enter
}

export function createListening(): Scene {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let w = 1;
  let h = 1;
  let dpr = 1;
  let nodes: Node[] = [];
  let running = false;
  let t = 0;
  let progress = 0;
  let enterTween: gsap.core.Tween | null = null;

  function seed() {
    const rnd = mulberry(11);
    nodes = [];
    const n = w < 768 ? 34 : 64;
    for (let i = 0; i < n; i++) {
      const big = i < (w < 768 ? 8 : 14);
      nodes.push({
        x: rnd(),
        y: 0.1 + rnd() * 0.85,
        r: big ? 6 + rnd() * 10 : 1 + rnd() * 2.2,
        vx: (rnd() - 0.5) * 0.012,
        vy: (rnd() - 0.5) * 0.008,
        phase: rnd() * Math.PI * 2,
        big,
        scale: 0,
      });
    }
  }

  function resize() {
    if (!canvas) return;
    dpr = dprCap(1.5);
    w = canvas.clientWidth || 1;
    h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!nodes.length) seed();
  }

  function draw(dt: number) {
    t += dt;
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.52;
    // soft haze
    const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.45);
    haze.addColorStop(0, 'rgba(255,255,255,0.05)');
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    // drift
    for (const n of nodes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt + Math.sin(t * 0.6 + n.phase) * 0.00006;
      if (n.x < -0.05) n.x = 1.05;
      if (n.x > 1.05) n.x = -0.05;
      if (n.y < 0.05) n.vy = Math.abs(n.vy);
      if (n.y > 0.97) n.vy = -Math.abs(n.vy);
    }
    // lines to the centre node (fade with distance)
    ctx.lineWidth = 1;
    for (const n of nodes) {
      if (!n.big) continue;
      const x = n.x * w;
      const y = n.y * h;
      const d = Math.hypot(x - cx, y - cy);
      const a = Math.max(0, 1 - d / (w * 0.55)) * 0.35 * n.scale;
      if (a <= 0.01) continue;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // nodes
    for (const n of nodes) {
      const x = n.x * w;
      const y = n.y * h;
      const r = n.r * n.scale * (1 + Math.sin(t * 1.3 + n.phase) * 0.08);
      if (r <= 0) continue;
      if (n.big) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(255,255,255,${n.big ? 0.95 : 0.7})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // centre node
    const cr = 9 * Math.min(1, progress * 4 + 0.2);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 4);
    cg.addColorStop(0, 'rgba(255,255,255,0.6)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  let last = 0;
  const tick = (time: number) => {
    const now = time * 1000;
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
    last = now;
    draw(dt);
  };

  return {
    mount(c) {
      canvas = c;
      ctx = c.getContext('2d')!;
      resize();
    },
    setActive(active) {
      if (active === running) return;
      running = active;
      if (active) {
        last = gsap.ticker.time * 1000;
        gsap.ticker.add(tick);
        enterTween?.kill();
        enterTween = gsap.to(nodes, { scale: 1, duration: 1.4, ease: 'elastic.out(1, .55)', stagger: { each: 0.012, from: 'center' } });
      } else {
        gsap.ticker.remove(tick);
        enterTween?.kill();
        for (const n of nodes) n.scale = 0;
      }
    },
    setProgress(p) {
      progress = p;
    },
    resize,
    destroy() {
      gsap.ticker.remove(tick);
    },
  };
}

function mulberry(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
