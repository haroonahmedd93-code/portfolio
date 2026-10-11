export interface Scene {
  /** Called once with the canvas to draw into. */
  mount(canvas: HTMLCanvasElement): void;
  /** Scene becomes/leaves the active one (start/stop its loop). */
  setActive(active: boolean): void;
  /** Scrub position inside this scene, 0 → 1 (plus transition margins). */
  setProgress(p: number): void;
  resize(): void;
  destroy(): void;
}

export const dprCap = (max = 1.5) => Math.min(window.devicePixelRatio || 1, max);
