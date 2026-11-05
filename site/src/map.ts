// The map page: the map itself is built into the page; this adds tooltips.
import { setUpMapTooltips } from './map-tooltips';
import { initShare } from './share';

const map = document.querySelector<HTMLElement>('.shelf-map');
const tip = document.getElementById('map-tip');
if (!map || !tip) throw new Error('Missing the shelf map on the page');
setUpMapTooltips(map, tip);
initShare();
