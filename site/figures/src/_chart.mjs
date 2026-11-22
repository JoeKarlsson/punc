// Shared by this post's charts: the torn panel, the stepped SMIL and the live/still layers.
//
// Every chart builds in: one change (Ralph Ammer's rule) once, when it first scrolls into
// view (src/scripts/pause-offscreen-scribbles.ts), then holds the finished frame for reading.
// Joe's call (2026-11-14, DECISIONS.md) after a 2026-11-13 review had stilled all but Dickens.
// No ease overshoots: a data dot never passes its real value.
// Moving pieces are SMIL stepped at 12 fps, like the DOOM post's go_to walk, so the figure
// plays inline with no script. The desktop SVG carries a live layer and a still one;
// motion.css swaps in the still under reduced motion and while motion is paused. The phone
// SVG is the still alone: phones get the finished chart, never the motion.
import { readFileSync } from 'node:fs';

import { COLORS } from '../draw.mjs';

export const DATA = JSON.parse(readFileSync(new URL('./data.json', import.meta.url), 'utf8'));

export const FPS = 12;
export const LOOP = 10; // seconds: the change, then the hold it freezes on
const RESET = LOOP - 0.5; // the still layer's frame: the finished chart
export const SANS = "var(--font-hanken-grotesk, 'Hanken Grotesk'), Arial, sans-serif";
export const DISPLAY = 'var(--font-anton, Anton), Impact, sans-serif';
export const PANEL = '#151515';
export const MUTED = COLORS.muted;
export { COLORS };

export const n = (v) => Math.round(v * 10) / 10;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** Progress of a step that starts at `start` and takes `dur` seconds. */
export const prog = (t, start, dur) => clamp01((t - start) / dur);
export const easeOut = (p) => 1 - (1 - p) ** 3;

const frames = Array.from({ length: LOOP * FPS }, (_, i) => i / FPS);

/** One attribute stepped through the loop; '' when it never changes. */
function stepped(fn, tag) {
	const values = frames.map((t) => String(fn(t)));
	const keep = values.map((v, i) => i === 0 || v !== values[i - 1]);
	if (keep.filter(Boolean).length === 1) return '';
	const vals = values.filter((_, i) => keep[i]).join(';');
	const times = frames
		.map((_, i) => (i / frames.length).toFixed(4))
		.filter((_, i) => keep[i])
		.join(';');
	return `<${tag} calcMode="discrete" values="${vals}" keyTimes="${times}" dur="${LOOP}s" fill="freeze"/>`;
}

/**
 * An element writer for one layer. live: attributes start at t=0 and step through the loop;
 * still: attributes hold the finished frame. anims maps an attribute to fn(t); the keys
 * translate, rotate and scale animate the transform (one per element: nest a <g> for more).
 */
export function writer(live) {
	const STILL = RESET - 0.01;
	return (tag, attrs = {}, anims = {}, children = '') => {
		const a = { ...attrs };
		let kids = '';
		for (const [key, fn] of Object.entries(anims)) {
			if (['translate', 'rotate', 'scale'].includes(key)) {
				a.transform = `${key}(${fn(live ? 0 : STILL)})`;
				if (live) kids += stepped(fn, `animateTransform attributeName="transform" type="${key}"`);
			} else {
				a[key] = fn(live ? 0 : STILL);
				if (live) kids += stepped(fn, `animate attributeName="${key}"`);
			}
		}
		const attrText = Object.entries(a)
			.filter(([, v]) => v !== undefined && v !== null)
			.map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
			.join('');
		return `<${tag}${attrText}>${kids}${children}</${tag}>`;
	};
}

/** Text with the site's fonts, for pieces the kit can't draw (they move or fade in). */
export function label(
	el,
	x,
	y,
	content,
	{
		size = 15,
		font = 'sans',
		color = COLORS.paper,
		anchor = 'middle',
		weight = 700,
		anims = {},
	} = {},
) {
	const value = String(content).replace(/&/g, '&amp;').replace(/</g, '&lt;');
	return el(
		'text',
		{
			x: n(x),
			y: n(y),
			'font-family': font === 'display' ? DISPLAY : SANS,
			'font-size': size,
			'font-weight': font === 'display' ? undefined : weight,
			fill: color,
			'text-anchor': anchor,
			'dominant-baseline': 'central',
			'letter-spacing': font === 'display' ? '0.5' : undefined,
		},
		anims,
		value,
	);
}

/** The torn black scrap the chart sits on, under the kit's text, boiling with the site's paper. */
export function panel(f, x, y, w, h, tilt = -0.4) {
	let seed = Math.round(x * 7 + y * 13 + w);
	const rand = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296 - 0.5;
	};
	const pts = [];
	const step = 14;
	for (let i = 0; i < w; i += step) pts.push([x + i, y + rand() * 5]);
	for (let i = 0; i < h; i += step) pts.push([x + w + rand() * 5, y + i]);
	for (let i = w; i > 0; i -= step) pts.push([x + i, y + h + rand() * 5]);
	for (let i = h; i > 0; i -= step) pts.push([x + rand() * 5, y + i]);
	const d = 'M' + pts.map(([px, py]) => `${n(px)},${n(py)}`).join(' L') + ' Z';
	f.raw(
		`<path class="d-paper" d="${d}" fill="${PANEL}" stroke="${COLORS.chalk}" stroke-width="2" transform="rotate(${tilt} ${n(x + w / 2)} ${n(y + h / 2)})"/>`,
		'groups',
	);
}

/** The moving pieces: on desktop a live layer plus its still, on a phone the still alone. */
export function layers(f, phone, draw) {
	if (phone) {
		f.raw(draw(writer(false)));
		return;
	}
	f.raw(`<g class="anim-live">${draw(writer(true))}</g>`);
	f.raw(`<g class="anim-still" display="none">${draw(writer(false))}</g>`);
}

/** A crayon line through points, as one path (the site boils .d-flow on the still layer). */
export const pathOf = (pts) => 'M' + pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' L');

/** A slightly torn tile outline around a centre, for paper slips. */
export function tornRect(cx, cy, w, h, seed) {
	let s = seed;
	const rand = () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return (s / 4294967296 - 0.5) * 2.4;
	};
	const x0 = cx - w / 2;
	const y0 = cy - h / 2;
	const pts = [
		[x0, y0],
		[x0 + w / 2, y0 + rand() * 0.6],
		[x0 + w, y0],
		[x0 + w + rand() * 0.6, y0 + h / 2],
		[x0 + w, y0 + h],
		[x0 + w / 2, y0 + h + rand() * 0.6],
		[x0, y0 + h],
		[x0 + rand() * 0.6, y0 + h / 2],
	].map(([px, py]) => [px + rand(), py + rand()]);
	return pathOf(pts) + ' Z';
}
