// Rows stored as one array per field. JSON then names each field once instead
// of once per book, which makes the shelf and numbers files about a third
// smaller to download and parse.
export type Columns<T> = { [K in keyof T]: T[K][] };

// A field a row lacks is null in its column, so every column has one entry per row.
export function toColumns<T extends object>(rows: T[]): Columns<T> {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))] as (keyof T)[];
  return Object.fromEntries(keys.map(key => [key, rows.map(row => row[key] ?? null)])) as Columns<T>;
}

export function fromColumns<T extends object>(columns: Columns<T>): T[] {
  const keys = Object.keys(columns) as (keyof T)[];
  const length = keys.length ? columns[keys[0]!].length : 0;
  const ragged = keys.find(key => columns[key].length !== length);
  if (ragged !== undefined) throw new Error(`Column ${String(ragged)} has ${columns[ragged].length} entries, not ${length}`);
  // Plain loops: thousands of rows are rebuilt while the page loads.
  const rows: T[] = new Array(length);
  for (let i = 0; i < length; i++) {
    const row = {} as T;
    for (const key of keys) row[key] = columns[key][i]!;
    rows[i] = row;
  }
  return rows;
}
