// The bulk importer: refreshes the shelf with Gutenberg's top books, analyzes
// them in the site build, renders their share cards, runs the checks, then
// commits the shelf files and pushes, which deploys the site.
//   npm run shelf:update             (top 500)
//   npm run shelf:update -- --top 200
import { execFileSync } from 'node:child_process';

const SHELF_PATHS = ['site/catalog.json', 'site/books', 'site/covers', 'site/share', 'site/static'];
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });
const output = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();

const topArg = process.argv.indexOf('--top');
const top = topArg === -1 ? [] : ['--top', process.argv[topArg + 1]];

run('git', ['pull', '--ff-only']);
run('node', ['site/scripts/fetch-books.mjs', ...top]);
run('npm', ['run', 'site:build']);
run('node', ['site/scripts/make-images.mjs']);
run('npm', ['run', 'check']);

run('git', ['add', '--all', '--', ...SHELF_PATHS]);
if (!output('git', ['diff', '--cached', '--name-only'])) {
  console.log('The shelf is already up to date; nothing to commit.');
} else {
  const count = JSON.parse(output('git', ['show', ':site/catalog.json'])).length;
  run('git', ['commit', '-m', `chore: Shelf refresh from Gutenberg's most downloaded books, ${count} on the shelf`]);
  run('git', ['push']);
}
