// A tooltip that follows the pointer (or keyboard focus) over each dot in a
// shelf map: every element with data-tip inside `map`, shown in `tip`.
export function setUpMapTooltips(map: HTMLElement, tip: HTMLElement): void {
  const show = (dot: Element, x: number, y: number) => {
    tip.textContent = dot.getAttribute('data-tip') ?? '';
    tip.hidden = false;
    const box = map.getBoundingClientRect();
    // The map can scroll sideways on phones; the tip lives in its scrolled content.
    const left = Math.min(x - box.left + 14, box.width - tip.offsetWidth - 4) + map.scrollLeft;
    const top = y - box.top - tip.offsetHeight - 14;
    tip.style.left = `${Math.max(4 + map.scrollLeft, left)}px`;
    tip.style.top = `${top < 4 ? y - box.top + 18 : top}px`;
  };
  const hide = () => (tip.hidden = true);

  map.querySelectorAll('[data-tip]').forEach(dot => {
    dot.addEventListener('pointermove', e => show(dot, (e as PointerEvent).clientX, (e as PointerEvent).clientY));
    dot.addEventListener('pointerleave', hide);
    dot.addEventListener('focus', () => {
      const r = dot.getBoundingClientRect();
      show(dot, r.left + r.width / 2, r.top);
    });
    dot.addEventListener('blur', hide);
  });
}
