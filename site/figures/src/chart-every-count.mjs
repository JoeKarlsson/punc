// Every way of counting: each method's estimate slides in from 0 and settles, its interval
// opens out, and the about-40% line is drawn last. The paper's numbers (paper/*-output.md).
// Copied from joekarlsson.com's scripts/diagrams/sentence-length-semicolons-punctuation.
import { COLORS, DATA, MUTED, easeOut, label, layers, n, panel, prog } from './_chart.mjs';

const ROWS = DATA.every_count;
const MAX = 70;
const T_LINE = 3.3;

export const alt =
	'Dot and interval chart: the share of the 1700-49 to 1900-49 drop in sentence length that is punctuation, measured eleven ways with 95% intervals. Each way counts a semicolon or colon only as often as it glues two clauses, except the last. Dashes counted as stops: 39%. Measured from 1750-99: 39%. The second coder\'s rates: 39%. The main estimate, all books: 40% (24 to 51). Each era\'s own glue rates: 41%. Plays and poetry removed: 41%. Editors\' notes removed: 41%. Strict sentence splitter: 43%. Narration only: 45%. English originals, checked by title page: 45% (29 to 53). Every semicolon and colon counted as a stop: 48% (33 to 61). A line marks about 40%.';

function chart(f, { W, H, phone }) {
	const L = phone ? 28 : 270;
	const R = phone ? W - 62 : W - 60;
	const top = phone ? 92 : 84;
	const rowH = phone ? 46 : 30;
	const x = (v) => L + (v / MAX) * (R - L);
	const bottom = top + ROWS.length * rowH;
	panel(f, 6, phone ? 46 : 42, W - 12, H - (phone ? 52 : 48));
	f.text(
		phone ? 20 : 16,
		phone ? 18 : 20,
		phone ? 'Every way of counting' : 'Every way of counting lands between 39% and 48%',
		{
			font: 'display',
			size: phone ? 19 : 22,
			anchor: 'start',
			upper: true,
		},
	);
	f.text(
		phone ? 20 : 16,
		phone ? 37 : 62,
		phone
			? 'Share of the drop that is punctuation'
			: 'Share of the 1700-49 to 1900-49 drop that is punctuation, with 95% intervals',
		{
			size: phone ? 14 : 13.5,
			anchor: 'start',
			color: MUTED,
		},
	);
	[0, 20, 40, 60].forEach((v) => {
		f.line(
			[
				[x(v), top - 8],
				[x(v), bottom],
			],
			{ color: '#2c2c2c', width: 1 },
		);
		f.text(x(v), bottom + 16, `${v}%`, { size: 13, color: MUTED });
	});
	ROWS.forEach((r, k) => {
		const cy = top + k * rowH + (phone ? 30 : rowH / 2);
		if (phone) f.text(16, cy - 18, r.label, { size: 13, anchor: 'start', weight: 600 });
		else f.text(L - 14, cy, r.label, { size: 13, anchor: 'end', weight: 600 });
		r.cy = cy;
	});

	layers(f, phone, (el) => {
		const out = [];
		ROWS.forEach((r, k) => {
			const start = 0.3 + k * 0.15;
			const slide = (t) => easeOut(prog(t, start, 0.6));
			const open = (t) => easeOut(prog(t, start + 0.5, 0.35));
			out.push(
				el(
					'line',
					{
						y1: r.cy,
						y2: r.cy,
						stroke: COLORS.chalk,
						'stroke-width': 3,
						'stroke-linecap': 'round',
					},
					{
						x1: (t) => n(x(r.est + (r.lo - r.est) * open(t))),
						x2: (t) => n(x(r.est + (r.hi - r.est) * open(t))),
						opacity: (t) => (open(t) > 0 ? 1 : 0),
					},
				),
				el(
					'circle',
					{ cy: r.cy, r: phone ? 6 : 6.5, fill: COLORS.pink, stroke: '#151515', 'stroke-width': 2 },
					{
						cx: (t) => n(x(r.est * slide(t))),
					},
				),
				label(el, x(r.hi) + 10, r.cy, `${r.est}%`, {
					size: 14,
					anchor: 'start',
					color: COLORS.pink,
					anims: { opacity: (t) => (open(t) >= 1 ? 1 : 0) },
				}),
			);
		});
		// The about-40% line, last: one piece on desktop, a short stroke per row on a phone.
		// No boil: the filter sizes itself to the bounding box, and a vertical line has no width.
		const drawn = (t) => easeOut(prog(t, T_LINE, 0.5));
		const spans = phone ? ROWS.map((r) => [r.cy - 10, r.cy + 10]) : [[top - 8, bottom]];
		spans.forEach(([y1, y2]) =>
			out.push(
				el(
					'line',
					{
						x1: n(x(40)),
						x2: n(x(40)),
						y1: n(y1),
						stroke: COLORS.chalk,
						'stroke-width': 2.5,
						'stroke-dasharray': '6 5',
					},
					{
						y2: (t) => n(y1 + (y2 - y1) * drawn(t)),
						opacity: (t) => (t >= T_LINE ? 1 : 0),
					},
				),
			),
		);
		out.push(
			label(el, x(40), bottom + 36, 'about 40%', {
				font: 'display',
				size: phone ? 15 : 17,
				anims: { opacity: (t) => (t >= T_LINE + 0.5 ? 1 : 0) },
			}),
		);
		return out.join('');
	});
}

export const desktop = { height: 470, draw: (f) => chart(f, { W: 640, H: 470, phone: false }) };
export const phone = { height: 660, draw: (f) => chart(f, { W: 360, H: 660, phone: true }) };
