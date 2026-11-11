// Animated figures (build.mjs inlineFigures) rest on their finished still and play once
// from the start when the reader presses Play, then settle back on the still. Nothing
// plays on scroll or on load, and the still is what prints.

/** Seconds in an SMIL `dur` like "9.5s" or "800ms". */
export const durationSeconds = (dur: string | null): number => {
  const match = /^([\d.]+)(ms|s)$/.exec(dur?.trim() ?? '');
  if (!match) throw new Error(`Unreadable animation duration: ${dur}`);
  return Number(match[1]) / (match[2] === 'ms' ? 1000 : 1);
};

export function initFigures(): void {
  for (const figure of document.querySelectorAll<HTMLElement>('.anim-figure')) {
    const svg = figure.querySelector<SVGSVGElement>('.figure-wide svg');
    const button = figure.querySelector<HTMLButtonElement>('.figure-play');
    if (!svg || !button) continue;
    svg.pauseAnimations();
    const seconds = durationSeconds(svg.querySelector('.anim-live [dur]')?.getAttribute('dur') ?? null);
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      svg.pauseAnimations();
      delete figure.dataset['playing'];
      button.textContent = 'Play';
    };
    button.addEventListener('click', () => {
      if (figure.dataset['playing'] !== undefined) return stop();
      figure.dataset['playing'] = '';
      button.textContent = 'Stop';
      svg.setCurrentTime(0);
      svg.unpauseAnimations();
      timer = window.setTimeout(stop, seconds * 1000);
    });
  }
}
