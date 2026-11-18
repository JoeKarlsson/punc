// A tooltip that follows the pointer (or keyboard focus) over each dot in a
// shelf map: every element with data-tip inside `map`, shown in `tip`.
// One set of listeners on the map, not one per dot: Chromium makes any SVG
// element with a focus listener a Tab stop, which put thousands of unnamed
// dots in the keyboard's way.
const mapsWithTooltips = new WeakSet<HTMLElement>();

export function setUpMapTooltips(map: HTMLElement, tip: HTMLElement): void {
  // Charts are redrawn inside the same map; the listeners already cover the new dots.
  if (mapsWithTooltips.has(map)) return;
  mapsWithTooltips.add(map);
  // Read the text, the sizes and the map's box once per dot, so following the pointer
  // only writes a transform and never forces a layout.
  let box = new DOMRect();
  let scrollLeft = 0;
  let tipWidth = 0;
  let tipHeight = 0;
  let current: Element | null = null;
  const dotAt = (target: EventTarget | null) =>
    target instanceof Element ? target.closest('[data-tip]') : null;
  const enter = (dot: Element) => {
    current = dot;
    tip.textContent = dot.getAttribute('data-tip') ?? '';
    tip.hidden = false;
    box = map.getBoundingClientRect();
    // The map can scroll sideways on phones; the tip lives in its scrolled content.
    scrollLeft = map.scrollLeft;
    tipWidth = tip.offsetWidth;
    tipHeight = tip.offsetHeight;
  };
  const place = (x: number, y: number) => {
    const left = Math.max(4, Math.min(x - box.left + 14, box.width - tipWidth - 4)) + scrollLeft;
    const top = y - box.top - tipHeight - 14;
    tip.style.translate = `${left}px ${top < 4 ? y - box.top + 18 : top}px`;
  };
  const hide = () => {
    current = null;
    tip.hidden = true;
  };

  map.addEventListener('pointerover', e => {
    const dot = dotAt(e.target);
    if (dot && dot !== current) enter(dot);
  });
  map.addEventListener('pointermove', e => {
    if (current) place(e.clientX, e.clientY);
  });
  map.addEventListener('pointerout', e => {
    if (current && dotAt(e.relatedTarget) !== current) hide();
  });
  map.addEventListener('focusin', e => {
    const dot = dotAt(e.target);
    if (!dot) return;
    enter(dot);
    const r = dot.getBoundingClientRect();
    place(r.left + r.width / 2, r.top);
  });
  map.addEventListener('focusout', hide);
}
