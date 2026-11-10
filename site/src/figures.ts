// Plays each animated figure (build.mjs inlineFigures) once most of it is on screen and
// it has sat there a beat, from its first frame, and pauses it when it scrolls away, so a
// reader scrolling past sees the change happen instead of its tail end.
const START_DELAY_MS = 400;

/** Most of a figure is on screen, or it fills most of the screen when it's taller than that. */
export const mostlyInView = (
  entry: Pick<IntersectionObserverEntry, 'intersectionRatio' | 'intersectionRect' | 'rootBounds'>
): boolean =>
  entry.intersectionRatio >= 0.6 ||
  (entry.rootBounds !== null && entry.intersectionRect.height >= 0.6 * entry.rootBounds.height);

export function initFigures(): void {
  const svgs = [...document.querySelectorAll<SVGSVGElement>('.anim-figure > div > svg')];
  if (!svgs.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const started = new WeakSet<SVGSVGElement>();
  const timers = new WeakMap<SVGSVGElement, number>();
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        const svg = entry.target as SVGSVGElement;
        clearTimeout(timers.get(svg));
        if (!entry.isIntersecting) svg.pauseAnimations();
        else if (started.has(svg)) svg.unpauseAnimations();
        else if (mostlyInView(entry))
          timers.set(
            svg,
            window.setTimeout(() => {
              started.add(svg);
              svg.setCurrentTime(0);
              svg.unpauseAnimations();
            }, START_DELAY_MS)
          );
      }
    },
    { threshold: [0, 0.3, 0.6, 1] }
  );
  for (const svg of svgs) {
    svg.pauseAnimations();
    observer.observe(svg);
  }
}
