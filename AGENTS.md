# Punc

TypeScript library and CLI that extracts punctuation from text files, counts it, reports words per sentence, and renders punctuation-only PDF visualizations (`src/`, tests in `tests/`).

Run `npm run check` (type check, lint, markdown lint, tests) before committing. For changes to the site, also run `npm run test:e2e` (Playwright, builds and serves the site itself).

The static site is in `site/` (built by `npm run site:build` into `site-dist/`, deployed to GitHub Pages on push to `main`). Its design follows joekarlsson.com: a photocopied punk zine look, black ground, hot pink `#ff4fd8`, Anton for poster type, Fraunces for reading and for the marks.
