import { mostlyInView } from '../site/src/figures';

describe('mostlyInView', () => {
  const box = (height: number) => ({ height }) as DOMRectReadOnly;
  const screen = box(800);

  it('waits for most of a figure, or most of a short screen', () => {
    expect(mostlyInView({ intersectionRatio: 0.2, intersectionRect: box(80), rootBounds: screen })).toBe(false);
    expect(mostlyInView({ intersectionRatio: 0.65, intersectionRect: box(260), rootBounds: screen })).toBe(true);
    // A tall figure on a phone held sideways never reaches 60% of itself
    expect(mostlyInView({ intersectionRatio: 0.4, intersectionRect: box(500), rootBounds: screen })).toBe(true);
  });
});
