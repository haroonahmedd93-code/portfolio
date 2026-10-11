/**
 * PROVE (their VALIDATION) — Matter.js proof stickers drop from the top, bounce
 * and stack; drag them with the mouse on fine pointers (A9). Text-only badges
 * until employer logos are cleared.
 */
import Matter from 'matter-js';
import { gsap } from '../../core/gsap';
import { coarsePointer } from '../../core/rm';
import { dprCap, type Scene } from './types';

const STICKERS = [
  { text: '+35% conversion', fill: '#7b3cff', ink: '#fff' },
  { text: 'fraud loss ↓', fill: '#e04bff', ink: '#fff' },
  { text: 'SHIPPED', fill: '#fef9ee', ink: '#0b0b0b' },
  { text: 'A/B tested', fill: '#6ff6ff', ink: '#0b0b0b' },
  { text: '0 → 1', fill: '#e8742e', ink: '#fff' },
  { text: 'tickets −40%', fill: '#0a0b24', ink: '#fff' },
  { text: 'LOVE', fill: '#ff4d6d', ink: '#fff' },
  { text: 'design system', fill: '#fef9ee', ink: '#0b0b0b' },
  { text: 'NPS ↑', fill: '#7b3cff', ink: '#fff' },
  { text: 'measured', fill: '#6ff6ff', ink: '#0b0b0b' },
  { text: 'proof', fill: '#e8742e', ink: '#fff' },
  { text: 'iterate', fill: '#e04bff', ink: '#fff' },
];

export function createValidation(): Scene {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let engine: Matter.Engine | null = null;
  let bodies: { body: Matter.Body; w: number; h: number; s: (typeof STICKERS)[number]; rot: number }[] = [];
  let walls: Matter.Body[] = [];
  let mouse: Matter.MouseConstraint | null = null;
  let w = 1;
  let h = 1;
  let dpr = 1;
  let running = false;
  let spawned = 0;
  let spawnTimer: gsap.core.Tween | null = null;

  function resize() {
    dpr = dprCap(1.5);
    w = canvas.clientWidth || 1;
    h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '600 20px "Instrument Sans", Helvetica, Arial, sans-serif';
    if (engine) {
      for (const b of walls) Matter.World.remove(engine.world, b);
      walls = makeWalls();
      Matter.World.add(engine.world, walls);
    }
  }

  function makeWalls() {
    const t = 200;
    return [
      Matter.Bodies.rectangle(w / 2, h + t / 2, w * 2, t, { isStatic: true }),
      Matter.Bodies.rectangle(-t / 2, h / 2, t, h * 4, { isStatic: true }),
      Matter.Bodies.rectangle(w + t / 2, h / 2, t, h * 4, { isStatic: true }),
    ];
  }

  function spawn() {
    if (!engine) return;
    const s = STICKERS[spawned % STICKERS.length];
    const scale = w < 768 ? 0.8 : 1;
    const tw = ctx.measureText(s.text).width;
    const bw = (tw + 44) * scale;
    const bh = 56 * scale;
    const x = w * 0.25 + Math.random() * w * 0.5;
    const body = Matter.Bodies.rectangle(x, -80, bw, bh, {
      chamfer: { radius: bh / 2 },
      restitution: 0.35,
      friction: 0.6,
      frictionAir: 0.012,
      angle: (Math.random() - 0.5) * 0.8,
    });
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);
    Matter.World.add(engine.world, body);
    bodies.push({ body, w: bw, h: bh, s, rot: 0 });
    spawned++;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const { body, w: bw, h: bh, s } of bodies) {
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.fillStyle = s.fill;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${20 * (w < 768 ? 0.8 : 1)}px "Instrument Sans", Helvetica, Arial, sans-serif`;
      ctx.fillText(s.text, 0, 1);
      ctx.restore();
    }
  }

  let last = 0;
  const tick = (time: number) => {
    if (!engine) return;
    const dt = Math.min(time - last, 0.05) || 0.016;
    last = time;
    Matter.Engine.update(engine, Math.min(dt * 1000, 33));
    draw();
  };

  function reset() {
    if (!engine) return;
    for (const b of bodies) Matter.World.remove(engine.world, b.body);
    bodies = [];
    spawned = 0;
    spawnTimer?.kill();
  }

  return {
    mount(c) {
      canvas = c;
      ctx = c.getContext('2d')!;
      engine = Matter.Engine.create({ gravity: { x: 0, y: 1.1 } });
      resize();
      if (!coarsePointer) {
        const m = Matter.Mouse.create(canvas);
        m.pixelRatio = dpr;
        mouse = Matter.MouseConstraint.create(engine, { mouse: m, constraint: { stiffness: 0.2 } });
        Matter.World.add(engine.world, mouse);
        // don't swallow the wheel
        const el = m.element as HTMLElement;
        el.removeEventListener('wheel', (m as unknown as { mousewheel: EventListener }).mousewheel);
        el.removeEventListener('DOMMouseScroll', (m as unknown as { mousewheel: EventListener }).mousewheel);
      }
    },
    setActive(active) {
      if (active === running) return;
      running = active;
      if (active) {
        last = gsap.ticker.time;
        gsap.ticker.add(tick);
        reset();
        spawnTimer = gsap.to({}, { duration: 0.1, repeat: STICKERS.length * 2 - 1, onRepeat: spawn, onStart: spawn });
      } else {
        gsap.ticker.remove(tick);
        spawnTimer?.kill();
      }
    },
    setProgress() {
      /* physics-driven */
    },
    resize,
    destroy() {
      gsap.ticker.remove(tick);
      spawnTimer?.kill();
      if (engine) Matter.Engine.clear(engine);
    },
  };
}
