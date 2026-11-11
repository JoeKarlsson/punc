// Script for pages with nothing else to run (About, the 404, and the share-image page
// rendered by site/scripts/make-images.mjs).
import { initPosters } from './posters';
import { initFigures } from './figures';
import { initShare } from './share';
import { suggestClosestPage } from './closest-page';

initPosters();
initShare();
initFigures();
if (document.body.dataset['notFound']) void suggestClosestPage();
