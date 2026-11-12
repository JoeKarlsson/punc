// The 404 page offers the real page nearest the address that missed (a typo, or a book
// that has since left the shelf under a slightly different slug).

const editDistance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = row;
  }
  return previous[b.length]!;
};

/** The candidate path nearest `missed`, or null when nothing is close enough to be a typo. */
export const closestPath = (missed: string, candidates: string[]): string | null =>
  closestMatch(missed.replace(/^\/+/, '').toLowerCase(), candidates);

/** The candidate nearest `wanted`, or null when nothing is close enough to be a typo. */
export function closestMatch(wanted: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(wanted, candidate);
    if (distance < bestDistance) [best, bestDistance] = [candidate, distance];
  }
  return bestDistance <= Math.max(2, Math.floor(wanted.length / 4)) ? best : null;
}

const PAGES: Record<string, string> = { 'about.html': 'About', 'numbers.html': 'The numbers', 'read.html': 'Read your own' };

export async function suggestClosestPage(): Promise<void> {
  const holder = document.getElementById('closest-page');
  if (!holder) return;
  const res = await fetch('books.json');
  if (!res.ok) throw new Error(`Couldn't load the shelf to suggest a page (${res.status})`);
  const titles = new Map<string, string>(Object.entries(PAGES));
  for (const { slug, title } of (await res.json()) as Array<{ slug: string; title: string }>) titles.set(`books/${slug}/`, title);
  const path = closestPath(location.pathname, [...titles.keys()]);
  if (!path) return;
  const link = document.createElement('a');
  link.href = path;
  link.textContent = titles.get(path)!;
  holder.append('Did you mean ', link, '?');
  holder.hidden = false;
}
