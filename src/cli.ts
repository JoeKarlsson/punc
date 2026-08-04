import { punc } from './punc';
import { createBarcodeSVG, createHeatmapSVG, createRadialSVG, createWaveformSVG, createScoreSVG, createSpiralSVG } from './svg';

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('-'));

if (!filePath || args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`
Usage: punc <file> [options]

Options:
  --barcode    Generate barcode stripe SVG/PNG
  --heatmap    Generate density heatmap SVG/PNG
  --radial     Generate frequency wheel SVG/PNG
  --waveform   Generate density waveform SVG/PNG
  --score      Generate punctuation score (reading-order grid) SVG/PNG
  --spiral     Generate sequence spiral SVG/PNG
  --all        Generate all six visualizations
  --png        Output PNG files instead of SVG
  --help, -h   Show this help
`);
  process.exit(filePath ? 0 : 1);
}

async function run(file: string) {
  process.stdout.write(`\nAnalyzing: ${file}\n\n`);

  const result = await punc(file);

  const entries = (Object.entries(result.count) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const topCount = entries[0]?.[1] ?? 1;

  const SEP = '─'.repeat(48);
  process.stdout.write(`${SEP}\n`);
  process.stdout.write(` Symbol     Count   Bar                    %\n`);
  process.stdout.write(`${SEP}\n`);

  for (const [char, count] of entries) {
    const bar = '█'.repeat(Math.round((count / topCount) * 18));
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    const sym = char.padStart(6);
    const cnt = String(count).padStart(9);
    process.stdout.write(`${sym}  ${cnt}   ${bar.padEnd(18)}  ${pct}%\n`);
  }

  process.stdout.write(`${SEP}\n`);
  process.stdout.write(`  Total punctuation  : ${total}\n`);
  const wps = result.wordsPerSentence;
  process.stdout.write(`  Words per sentence : ${wps === Infinity ? '∞' : wps.toFixed(1)}\n\n`);

  const all = args.includes('--all');
  const format = args.includes('--png') ? 'png' as const : 'svg' as const;
  const tasks: Array<Promise<string>> = [];

  if (all || args.includes('--barcode')) {
    tasks.push(createBarcodeSVG(file, { format }).then(r => `  barcode  → ${r.pathToFile}`));
  }
  if (all || args.includes('--heatmap')) {
    tasks.push(createHeatmapSVG(file, { format }).then(r => `  heatmap  → ${r.pathToFile}`));
  }
  if (all || args.includes('--radial')) {
    tasks.push(createRadialSVG(file, { format }).then(r => `  radial   → ${r.pathToFile}`));
  }
  if (all || args.includes('--waveform')) {
    tasks.push(createWaveformSVG(file, { format }).then(r => `  waveform → ${r.pathToFile}`));
  }
  if (all || args.includes('--score')) {
    tasks.push(createScoreSVG(file, { format }).then(r => `  score    → ${r.pathToFile}`));
  }
  if (all || args.includes('--spiral')) {
    tasks.push(createSpiralSVG(file, { format }).then(r => `  spiral   → ${r.pathToFile}`));
  }

  if (tasks.length > 0) {
    process.stdout.write('Generating visualizations...\n');
    const lines = await Promise.all(tasks);
    for (const line of lines) process.stdout.write(`${line}\n`);
  }
}

run(filePath).catch(err => {
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  process.exit(1);
});
