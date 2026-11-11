// A tooltip that follows the pointer (or keyboard focus) over each dot in a
// shelf map: every element with data-tip inside `map`, shown in `tip`.
export function setUpMapTooltips(map: HTMLElement, tip: HTMLElement): void {
  // Read the text, the sizes and the map's box once per dot, so following the pointer
  // only writes a transform and never forces a layout.
  let box = new DOMRect();
  let scrollLeft = 0;
  let tipWidth = 0;
  let tipHeight = 0;
  const enter = (dot: Element) => {
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
  const hide = () => (tip.hidden = true);

  map.querySelectorAll('[data-tip]').forEach(dot => {
    dot.addEventListener('pointerenter', () => enter(dot));
    dot.addEventListener('pointermove', e => place((e as PointerEvent).clientX, (e as PointerEvent).clientY));
    dot.addEventListener('pointerleave', hide);
    dot.addEventListener('focus', () => {
      enter(dot);
      const r = dot.getBoundingClientRect();
      place(r.left + r.width / 2, r.top);
    });
    dot.addEventListener('blur', hide);
  });
}
