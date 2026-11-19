// The front page's scanner: Punc reading a book's first page word by word.
// Each word goes dark once it's read; each mark stays lit where it was, with
// a small tag naming it, so the page ends as Punc's picture of it. The
// openings come from the build (site/build.mjs) as JSON in the page.
import { defaultMapping } from '../../src/mapping';
import { foldTypography } from '../../src/text';
import { MARK_NAMES } from './patterns';

export interface Opening {
  slug: string;
  title: string;
  author: string;
  text: string;
}

export type ScanToken =
  | { kind: 'word' | 'space' | 'break'; text: string }
  | { kind: 'mark'; text: string; mark: string };

// The single marks Punc counts (the same mapping analyzeText checks).
const COUNTED = new Set(Object.keys(defaultMapping()).filter(key => [...key].length === 1));

// Splits a passage the way Punc reads it: a character is a mark when its
// folded form is one Punc counts (curly quotes and dashes included), and
// everything else between spaces is words. A line break is a paragraph break.
export function scanTokens(passage: string): ScanToken[] {
  const tokens: ScanToken[] = [];
  for (const [, para, space, run] of passage.matchAll(/(\s*\n\s*)|(\s+)|(\S)/gu)) {
    if (para) tokens.push({ kind: 'break', text: '\n' });
    else if (space) tokens.push({ kind: 'space', text: ' ' });
    else {
      const ch = run!;
      const folded = foldTypography(ch);
      const mark = [...folded][0]!;
      const last = tokens.at(-1);
      if (COUNTED.has(mark)) tokens.push({ kind: 'mark', text: ch, mark });
      else if (last?.kind === 'word') last.text += ch;
      else tokens.push({ kind: 'word', text: ch });
    }
  }
  return tokens;
}

const SVG = 'http://www.w3.org/2000/svg';
const STEP_MS = 45;
const HOLD_MS = 3200;

function svgEl(tag: string, attrs: Record<string, number | string>): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function initScanner(): void {
  const data = document.getElementById('scanner-openings');
  const stage = document.getElementById('scanner-stage');
  const caption = document.getElementById('scanner-book');
  if (!data || !stage || !caption) return;
  const openings = JSON.parse(data.textContent ?? '[]') as Opening[];
  // The text and its tags move together, so tags stay on their marks as the page lifts.
  const page = stage.querySelector<HTMLElement>('.scanner-page')!;
  const text = stage.querySelector<HTMLElement>('.scanner-text')!;
  const tags = stage.querySelector<SVGSVGElement>('.scanner-tags')!;
  const readout = stage.querySelector<HTMLElement>('.scanner-readout')!;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  let index = 0;
  let spans: HTMLElement[] = [];
  let tokens: ScanToken[] = [];
  let at = 0;
  let shift = 0;
  let previous: Box | undefined;
  let cursor: SVGElement | undefined;
  let underCursor: HTMLElement | undefined;
  let counts = new Map<string, number>();
  let total = 0;
  let timer: number | undefined;
  let visible = false;

  // Measured against the page, which moves with the text, so a lift never moves a box.
  const boxOf = (span: HTMLElement): Box => {
    const r = span.getBoundingClientRect();
    const p = page.getBoundingClientRect();
    return { x: r.left - p.left - 3, y: r.top - p.top + r.height * 0.12, w: r.width + 6, h: r.height * 0.8 };
  };

  const showReadout = () => {
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4);
    readout.replaceChildren(
      ...[`Marks ${total}`, ...top.map(([mark, n]) => `${MARK_NAMES[mark] ?? mark} ${n}`)].map(line => {
        const span = document.createElement('span');
        span.textContent = line;
        return span;
      })
    );
  };

  const load = () => {
    const opening = openings[index]!;
    tokens = scanTokens(opening.text);
    spans = tokens.map(token => {
      const span = document.createElement('span');
      span.className = `scan-${token.kind}`;
      span.textContent = token.text;
      return span;
    });
    text.replaceChildren(...spans);
    // A new page starts at the top at once, not with the lift's slide.
    page.style.transition = 'none';
    page.style.transform = '';
    void page.offsetHeight;
    page.style.transition = '';
    shift = 0;
    cursor = svgEl('rect', { class: 'scanner-cursor', width: 0, height: 0 });
    tags.replaceChildren(cursor);
    underCursor = undefined;
    at = 0;
    previous = undefined;
    counts = new Map();
    total = 0;
    const link = document.createElement('a');
    link.href = `books/${opening.slug}/`;
    link.textContent = opening.title;
    caption.replaceChildren(link, `, ${opening.author}`);
    showReadout();
  };

  // Boxes a mark, names it, and strings it to the mark before, for good.
  const light = (span: HTMLElement, mark: string) => {
    span.classList.add('lit');
    const n = (counts.get(mark) ?? 0) + 1;
    counts.set(mark, n);
    total++;
    const box = boxOf(span);
    const group = svgEl('g', {});
    if (previous) group.append(svgEl('line', { x1: previous.x + previous.w / 2, y1: previous.y + previous.h, x2: box.x + box.w / 2, y2: box.y + box.h }));
    group.append(svgEl('rect', { x: box.x, y: box.y, width: box.w, height: box.h }));
    const name = svgEl('text', { x: box.x, y: box.y - 4 }) as SVGTextElement;
    name.textContent = `${MARK_NAMES[mark] ?? mark} #${n}`;
    group.append(name);
    // Two marks side by side ("?”") would print their tags on top of each other.
    if (previous && Math.abs(previous.y - box.y) < 4 && Math.abs(previous.x - box.x) < 90) name.setAttribute('y', String(box.y + box.h + 11));
    previous = box;
    tags.append(group);
    name.setAttribute('x', String(Math.max(4, Math.min(box.x, page.clientWidth - name.getComputedTextLength() - 6))));
  };

  // Reduced motion: the finished page, no reading.
  const finish = () => {
    tokens.forEach((token, i) => {
      if (token.kind === 'word') spans[i]!.classList.add('read');
      if (token.kind === 'mark') light(spans[i]!, token.mark);
    });
    showReadout();
  };

  const step = () => {
    timer = undefined;
    if (!visible) return;
    // The word the scan box sat on goes dark as the box moves on.
    underCursor?.classList.add('read');
    underCursor = undefined;
    // Skip spaces and breaks; they take no time to read.
    while (at < tokens.length && (tokens[at]!.kind === 'space' || tokens[at]!.kind === 'break')) at++;
    const token = tokens[at];
    const span = spans[at++];
    if (!token || !span) {
      cursor?.setAttribute('width', '0');
      timer = window.setTimeout(() => {
        index = (index + 1) % openings.length;
        load();
        step();
      }, HOLD_MS);
      return;
    }
    // Keep the reading point in view: lift the page when it nears the bottom.
    const bottom = stage.getBoundingClientRect().bottom - readout.offsetHeight;
    const over = span.getBoundingClientRect().bottom - (bottom - 24);
    if (over > 0) {
      shift -= over + stage.clientHeight * 0.3;
      page.style.transform = `translateY(${shift}px)`;
    }
    const box = boxOf(span);
    for (const [key, value] of Object.entries({ x: box.x, y: box.y, width: box.w, height: box.h })) cursor?.setAttribute(key, String(value));
    if (token.kind === 'word') underCursor = span;
    else if (token.kind === 'mark') {
      light(span, token.mark);
      showReadout();
    }
    timer = window.setTimeout(step, STEP_MS);
  };

  const run = () => {
    const shouldRun = visible && !document.hidden && !still.matches;
    if (shouldRun && timer === undefined) step();
    if (!shouldRun && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };

  load();
  // Tags are measured once, so wait for Fraunces: the fallback font sets the marks elsewhere.
  if (still.matches) void document.fonts.ready.then(finish);
  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    run();
  }, { threshold: 0.3 }).observe(stage);
  document.addEventListener('visibilitychange', run);
  still.addEventListener('change', () => {
    load();
    if (still.matches) finish();
    run();
  });
}
