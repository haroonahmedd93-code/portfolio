/**
 * All site copy and structured content lives here.
 * It is rendered into static HTML at build time by `src/render/html.ts`
 * (wired through the `renderContent` Vite plugin in `vite.config.ts`).
 *
 * Anything marked PLACEHOLDER is waiting on Haroon's final words or assets.
 */

export interface Site {
  name: string;
  shortName: string;
  role: string;
  location: string;
  email: string;
  linkedin: string;
  url: string;
  description: string;
  year: number;
}

export interface Pillar {
  id: 'listen' | 'simplify' | 'craft' | 'prove';
  index: string;
  title: string;
  body: string;
  /** Scene placeholder label until Stage 6 */
  scene: string;
}

export interface Frame {
  src: string;
  alt: string;
  /** 'phone' | 'desktop' | 'tablet' — drives the device frame aspect */
  kind: 'phone' | 'desktop' | 'tablet';
}

export interface CaseChapter {
  id: string;
  label: string;
  title: string;
  paragraphs: string[];
  /** Optional sub-blocks (e.g. Research, Key insights) */
  blocks?: { heading: string; paragraphs: string[] }[];
  /** Optional feature screens (used by the Solution chapter) */
  features?: Frame[];
  /** Optional metric grid (used by Impact) */
  metrics?: { value: string; label: string }[];
}

export interface Project {
  slug: string;
  title: string;
  titleLines: string[];
  year: string;
  tag?: 'NEW' | 'SHIPPED' | 'ONGOING';
  pitch: string;
  company: string;
  frames: Frame[];
  heroTile: string;
  case: {
    intro: string;
    role: string;
    timeline: string;
    team: string;
    hero: Frame;
    chapters: CaseChapter[];
    link?: { label: string; href: string };
  };
}

export const site: Site = {
  name: 'Haroon Ahmed Butt',
  shortName: 'Haroon',
  role: 'Senior Product Designer',
  location: 'Dubai, UAE',
  // PLACEHOLDER: swap for the address you want public
  email: 'hello@haroonahmedbutt.com',
  // PLACEHOLDER: your LinkedIn profile URL
  linkedin: 'https://www.linkedin.com/in/haroonahmedbutt',
  url: 'https://haroonahmedbutt123.vercel.app',
  description:
    'Haroon Ahmed Butt is a Senior Product Designer in Dubai designing complex marketplace and fintech products — Bayut, Motive, YallaMotor and Daraz.',
  year: new Date().getFullYear(),
};

export const hero = {
  // PLACEHOLDER hero line (plan: "I design complex products 0 → 1")
  lede: 'I design complex products 0 → 1',
  title: ['SENIOR', 'PRODUCT', 'DESIGNER'],
  script: site.location,
};

export const manifesto = {
  // PLACEHOLDER until Haroon writes his own line
  lines: ['Products people trust aren’t an accident.', 'They take four things:'],
};

export const pillars: Pillar[] = [
  {
    id: 'listen',
    index: '01',
    title: 'LISTEN',
    body:
      'Research, data and stakeholders first. Every project starts by understanding what people are actually trying to do — and what the business needs to be true.',
    scene: 'Constellation — particle network (Stage 6)',
  },
  {
    id: 'simplify',
    index: '02',
    title: 'SIMPLIFY',
    body:
      'Complex marketplaces and fintech made clear. Fewer steps, better defaults, and flows that make the right choice the easy one.',
    scene: 'Spectral orb → liquid ring (Stage 6)',
  },
  {
    id: 'craft',
    index: '03',
    title: 'CRAFT',
    body:
      'Design systems, motion and prototyping that survive contact with engineering. Built TrueFrame to turn Figma screens into responsive, animated code.',
    scene: 'Liquid-glass card control UI (Stage 6)',
  },
  {
    id: 'prove',
    index: '04',
    title: 'PROVE',
    body:
      'Experiments, metrics and outcomes. Conversion lifts, fraud losses cut, support tickets down — the proof that the design worked.',
    scene: 'Physics proof stickers (Stage 6)',
  },
];

const ph = (name: string) => `/media/${name}.svg`;

export const projects: Project[] = [
  {
    slug: 'bayut',
    title: 'Bayut web redesign',
    titleLines: ['BAYUT', 'WEB'],
    year: '2026',
    tag: 'NEW',
    pitch:
      'Rethinking the UAE’s largest property marketplace for the web — search, listing and agent experiences rebuilt on a new design system.',
    company: 'Bayut · Dubizzle Group',
    heroTile: ph('tile-bayut-1'),
    frames: [
      { src: ph('bayut-01'), alt: 'Bayut homepage search — placeholder frame', kind: 'desktop' },
      { src: ph('bayut-02'), alt: 'Bayut search results — placeholder frame', kind: 'desktop' },
      { src: ph('bayut-03'), alt: 'Bayut listing detail — placeholder frame', kind: 'desktop' },
      { src: ph('bayut-04'), alt: 'Bayut mobile listing — placeholder frame', kind: 'phone' },
      { src: ph('bayut-05'), alt: 'Bayut agent profile — placeholder frame', kind: 'desktop' },
    ],
    case: {
      intro:
        'Bayut is where most of the UAE looks for a home. The web experience had grown feature by feature for a decade; this project rebuilt it section by section on a single responsive system without pausing the business.',
      role: 'Senior Product Designer — lead on web',
      timeline: '2026 · ongoing',
      team: 'Product, 2 designers, 6 engineers, data',
      hero: { src: ph('bayut-hero'), alt: 'Bayut web redesign hero — placeholder', kind: 'desktop' },
      chapters: [
        {
          id: 'challenge',
          label: 'Challenge',
          title: 'A marketplace that had outgrown its interface',
          paragraphs: [
            'PLACEHOLDER — Describe the starting point: inconsistent patterns across search, listing and agent pages, slow iteration, and the metrics that made the redesign urgent.',
          ],
        },
        {
          id: 'process',
          label: 'Design process',
          title: 'Rebuilding in public, one section at a time',
          paragraphs: ['PLACEHOLDER — How the work was sequenced and validated.'],
          blocks: [
            { heading: 'Research', paragraphs: ['PLACEHOLDER — Interviews, session recordings, search analytics.'] },
            { heading: 'Key insights', paragraphs: ['PLACEHOLDER — The three findings that shaped the direction.'] },
          ],
        },
        {
          id: 'solution',
          label: 'Solution',
          title: 'One system, every surface',
          paragraphs: ['PLACEHOLDER — The design system, the simulator-driven handoff, and the new page templates.'],
          features: [
            { src: ph('bayut-01'), alt: 'Homepage — placeholder', kind: 'desktop' },
            { src: ph('bayut-02'), alt: 'Search results — placeholder', kind: 'desktop' },
            { src: ph('bayut-03'), alt: 'Listing detail — placeholder', kind: 'desktop' },
            { src: ph('bayut-04'), alt: 'Mobile listing — placeholder', kind: 'phone' },
          ],
        },
        {
          id: 'impact',
          label: 'Impact',
          title: 'What changed',
          paragraphs: ['PLACEHOLDER — Outcomes once sections shipped.'],
          metrics: [
            { value: '—', label: 'Search → listing CTR' },
            { value: '—', label: 'Lead conversion' },
            { value: '—', label: 'Design → dev handoff time' },
          ],
        },
        {
          id: 'challenges',
          label: 'Challenges overcome',
          title: 'Shipping a redesign without a relaunch',
          paragraphs: ['PLACEHOLDER'],
        },
        {
          id: 'lessons',
          label: 'Lessons learned',
          title: 'Systems win when they ship in pieces',
          paragraphs: ['PLACEHOLDER'],
        },
      ],
      link: { label: 'Visit bayut.com', href: 'https://www.bayut.com' },
    },
  },
  {
    slug: 'motive',
    title: 'Motive card controls & fraud',
    titleLines: ['MOTIVE', 'CARDS'],
    year: '2024',
    tag: 'SHIPPED',
    pitch:
      'Spend controls, MCC limits and fraud defences for fleet cards — giving fleet managers precise control without slowing drivers at the pump.',
    company: 'Motive (formerly KeepTruckin)',
    heroTile: ph('tile-motive-1'),
    frames: [
      { src: ph('motive-01'), alt: 'Card controls dashboard — placeholder frame', kind: 'desktop' },
      { src: ph('motive-02'), alt: 'Spend limit editor — placeholder frame', kind: 'desktop' },
      { src: ph('motive-03'), alt: 'Fraud alert flow — placeholder frame', kind: 'phone' },
      { src: ph('motive-04'), alt: 'Transaction review — placeholder frame', kind: 'desktop' },
    ],
    case: {
      intro:
        'Fleet cards move a lot of money through a lot of hands. This work gave fleet managers card-level controls — merchant categories, limits, schedules — and a fraud review flow that caught misuse before it became loss.',
      role: 'Senior Product Designer — Cards team',
      timeline: '2023 – 2025',
      team: 'PM, 1 designer, 8 engineers, risk & compliance',
      hero: { src: ph('motive-hero'), alt: 'Motive card controls — placeholder', kind: 'desktop' },
      chapters: [
        { id: 'challenge', label: 'Challenge', title: 'Control without friction', paragraphs: ['PLACEHOLDER'] },
        {
          id: 'process',
          label: 'Design process',
          title: 'Designing with risk, not around it',
          paragraphs: ['PLACEHOLDER'],
          blocks: [
            { heading: 'Research', paragraphs: ['PLACEHOLDER'] },
            { heading: 'Key insights', paragraphs: ['PLACEHOLDER'] },
          ],
        },
        {
          id: 'solution',
          label: 'Solution',
          title: 'Controls, limits, review',
          paragraphs: ['PLACEHOLDER'],
          features: [
            { src: ph('motive-01'), alt: 'Card controls — placeholder', kind: 'desktop' },
            { src: ph('motive-02'), alt: 'Limits — placeholder', kind: 'desktop' },
            { src: ph('motive-03'), alt: 'Fraud alert — placeholder', kind: 'phone' },
          ],
        },
        {
          id: 'impact',
          label: 'Impact',
          title: 'What changed',
          paragraphs: ['PLACEHOLDER'],
          metrics: [
            { value: '—', label: 'Fraud loss' },
            { value: '—', label: 'Declined-at-pump rate' },
            { value: '—', label: 'Support tickets' },
          ],
        },
        { id: 'challenges', label: 'Challenges overcome', title: 'Compliance, latency, trust', paragraphs: ['PLACEHOLDER'] },
        { id: 'lessons', label: 'Lessons learned', title: 'Defaults are the product', paragraphs: ['PLACEHOLDER'] },
      ],
      link: { label: 'Visit gomotive.com', href: 'https://gomotive.com' },
    },
  },
  {
    slug: 'trueframe',
    title: 'TrueFrame',
    titleLines: ['TRUE', 'FRAME'],
    year: '2025',
    tag: 'ONGOING',
    pitch:
      'A simulator that turns Figma design-system screens into responsive, animated code — so handoff is a living page, not a static frame.',
    company: 'Independent product',
    heroTile: ph('tile-trueframe-1'),
    frames: [
      { src: ph('trueframe-01'), alt: 'TrueFrame simulator — placeholder frame', kind: 'desktop' },
      { src: ph('trueframe-02'), alt: 'Breakpoint preview — placeholder frame', kind: 'desktop' },
      { src: ph('trueframe-03'), alt: 'Animation timeline — placeholder frame', kind: 'desktop' },
      { src: ph('trueframe-04'), alt: 'Mobile preview — placeholder frame', kind: 'phone' },
    ],
    case: {
      intro:
        'Static mockups lie about motion and breakpoints. TrueFrame reads a design-system file and renders real, responsive, animated pages from it — the same artefact designers review and engineers ship.',
      role: 'Founder, designer and builder',
      timeline: '2025 · ongoing',
      team: 'Solo',
      hero: { src: ph('trueframe-hero'), alt: 'TrueFrame — placeholder', kind: 'desktop' },
      chapters: [
        { id: 'challenge', label: 'Challenge', title: 'Handoff is where fidelity dies', paragraphs: ['PLACEHOLDER'] },
        { id: 'process', label: 'Design process', title: 'Prototype, use, repeat', paragraphs: ['PLACEHOLDER'] },
        {
          id: 'solution',
          label: 'Solution',
          title: 'From tokens to living pages',
          paragraphs: ['PLACEHOLDER'],
          features: [
            { src: ph('trueframe-01'), alt: 'Simulator — placeholder', kind: 'desktop' },
            { src: ph('trueframe-02'), alt: 'Breakpoints — placeholder', kind: 'desktop' },
          ],
        },
        { id: 'impact', label: 'Impact', title: 'What changed', paragraphs: ['PLACEHOLDER'] },
        { id: 'lessons', label: 'Lessons learned', title: 'Build the tool you wish you had', paragraphs: ['PLACEHOLDER'] },
      ],
    },
  },
  {
    slug: 'yallamotor',
    title: 'YallaMotor',
    titleLines: ['YALLA', 'MOTOR'],
    year: '2022',
    pitch:
      'MENA’s automotive marketplace — new and used car search, listings and dealer tools redesigned for buyers across the region.',
    company: 'YallaMotor',
    heroTile: ph('tile-yallamotor-1'),
    frames: [
      { src: ph('yallamotor-01'), alt: 'YallaMotor home — placeholder frame', kind: 'desktop' },
      { src: ph('yallamotor-02'), alt: 'Car search — placeholder frame', kind: 'phone' },
      { src: ph('yallamotor-03'), alt: 'Listing page — placeholder frame', kind: 'desktop' },
      { src: ph('yallamotor-04'), alt: 'Dealer tools — placeholder frame', kind: 'desktop' },
    ],
    case: {
      intro:
        'PLACEHOLDER — A short framing paragraph for the YallaMotor work: the market, the users and what the redesign set out to fix.',
      role: 'Senior Product Designer',
      timeline: '2021 – 2023',
      team: 'PM, 2 designers, engineering',
      hero: { src: ph('yallamotor-hero'), alt: 'YallaMotor — placeholder', kind: 'desktop' },
      chapters: [
        { id: 'challenge', label: 'Challenge', title: 'Buying a car across borders', paragraphs: ['PLACEHOLDER'] },
        { id: 'process', label: 'Design process', title: 'Research to release', paragraphs: ['PLACEHOLDER'] },
        {
          id: 'solution',
          label: 'Solution',
          title: 'Search, listing, dealer',
          paragraphs: ['PLACEHOLDER'],
          features: [
            { src: ph('yallamotor-01'), alt: 'Home — placeholder', kind: 'desktop' },
            { src: ph('yallamotor-02'), alt: 'Search — placeholder', kind: 'phone' },
          ],
        },
        { id: 'impact', label: 'Impact', title: 'What changed', paragraphs: ['PLACEHOLDER'] },
        { id: 'lessons', label: 'Lessons learned', title: 'Regional is not one market', paragraphs: ['PLACEHOLDER'] },
      ],
      link: { label: 'Visit yallamotor.com', href: 'https://uae.yallamotor.com' },
    },
  },
];

/** 12 tiles for the hero wall (static grid in Stage 1, Three.js wall from Stage 3). */
export const heroTiles: { src: string; alt: string; href: string }[] = [
  'bayut', 'motive', 'trueframe', 'yallamotor',
  'bayut', 'motive', 'trueframe', 'yallamotor',
  'bayut', 'motive', 'trueframe', 'yallamotor',
].map((slug, i) => ({
  src: ph(`tile-${slug}-${Math.floor(i / 4) + 1}`),
  alt: '',
  href: `/cases/${slug}/`,
}));

export const about = {
  title: ['ABOUT', 'ME'],
  portrait: { src: ph('portrait'), alt: 'Portrait of Haroon Ahmed Butt — placeholder' },
  paragraphs: [
    'I’m Haroon, a Senior Product Designer in Dubai. I design the complicated things — property and auto marketplaces, fintech card controls, fraud and risk tooling — and make them feel simple.',
    'Currently at Bayut (Dubizzle Group), leading the web redesign on a new design system. Before that: Motive’s Cards team, YallaMotor, Daraz (Alibaba Group) and Zameen. I started in materials engineering, which is probably why I care so much about how things are built.',
    'Outside of product work I build tools for designers — TrueFrame turns Figma systems into responsive, animated code — and I talk about AI and design whenever someone hands me a mic.',
  ],
  signature: 'Haroon',
};

export const outro = {
  // PLACEHOLDER per plan
  title: ['LET’S BUILD', 'THE NEXT BIG THING'],
};

export const nav = [
  { id: 'intro', label: 'Intro' },
  { id: 'approach', label: 'Approach' },
  { id: 'work', label: 'Works' },
  { id: 'about', label: 'About' },
];
