// The hand-coded sample: the 82 semicolons and colons from English-original 1700s prose (the paper's
// glue rates), each a paper slip that turns over, in coding order, to glue (pink: it joins two clauses) or not.
// Copied from joekarlsson.com's scripts/diagrams/sentence-length-semicolons-punctuation; data from paper/reanalysis.py.
import { COLORS, DATA, PANEL, SANS, label, layers, n, panel, prog, tornRect } from './_chart.mjs';

const CODES = DATA.hand_coded.codes;
const T0 = 0.4;
const EACH = 0.035;
const FLIP = 4 / 12; // four drawings: edge-on at the middle two

export const alt =
	'Eighty-two paper slips, one for each semicolon and colon from English-original 1700s prose in a random sample of 100. Each turns over to pink if the mark glues two clauses that could each stand as a sentence, or dark if it separates a list, introduces a quotation, or sits in a heading or footnote. 36 of 50 semicolons glue two clauses (72%), and 19 of 32 colons do (59%).';

function chart(f, { W, H, phone }) {
	const cols = phone ? 10 : 20;
	const tile = phone ? 25 : 22;
	const gap = 5;
	const gridW = cols * (tile + gap) - gap;
	const x0 = (W - gridW) / 2;
	panel(f, 6, phone ? 46 : 42, W - 12, H - (phone ? 52 : 48));
	f.text(
		phone ? 20 : 16,
		phone ? 18 : 20,
		phone ? 'Does it glue two clauses?' : 'Does the mark glue two clauses? 82 marks from the 1700s',
		{
			font: 'display',
			size: phone ? 19 : 22,
			anchor: 'start',
			upper: true,
		},
	);
	if (phone)
		f.text(12, 37, '82 marks from English originals', {
			size: 14,
			anchor: 'start',
			color: COLORS.muted,
		});

	const groups = [
		{
			name: 'Semicolons',
			codes: CODES.filter((c) => c.mark === ';'),
			total: '36 of 50 glue (72%)',
		},
		{ name: 'Colons', codes: CODES.filter((c) => c.mark === ':'), total: '19 of 32 glue (59%)' },
	];
	let y = phone ? 82 : 78;
	const placed = [];
	for (const g of groups) {
		f.text(x0, y, g.name, { font: 'display', size: phone ? 17 : 19, anchor: 'start', upper: true });
		g.labelY = y;
		y += 22;
		g.codes.forEach((c, i) => {
			placed.push({
				...c,
				cx: x0 + (i % cols) * (tile + gap) + tile / 2,
				cy: y + Math.floor(i / cols) * (tile + gap) + tile / 2,
			});
		});
		y += Math.ceil(g.codes.length / cols) * (tile + gap) + (phone ? 26 : 22);
		g.done = T0 + (placed.length - 1) * EACH + FLIP;
	}
	const keyY = y + 2;
	const keyItems = [
		[COLORS.pink, COLORS.ink, null, 'glues two clauses'],
		[
			PANEL,
			COLORS.chalk,
			COLORS.chalk,
			phone ? "doesn't (list, quote, heading)" : "doesn't: a list, a quotation, a heading",
		],
	];

	layers(f, phone, (el) => {
		const out = [];
		placed.forEach((c, k) => {
			const at = T0 + k * EACH;
			const turned = (t) => t >= at + FLIP / 2;
			const sx = (t) => {
				const p = prog(t, at, FLIP);
				return p <= 0 || p >= 1 ? '1 1' : `${n(Math.max(0.08, Math.abs(1 - 2 * p)))} 1`;
			};
			const face = c.glue ? COLORS.pink : PANEL;
			const ink = c.glue ? COLORS.ink : COLORS.chalk;
			const tilt = ((k * 37) % 7) - 3;
			out.push(
				el(
					'g',
					{ transform: `translate(${n(c.cx)} ${n(c.cy)}) rotate(${tilt * 0.6})` },
					{},
					el(
						'g',
						{},
						{ scale: sx },
						el(
							'path',
							{ d: tornRect(0, 0, tile, tile, k + 3), 'stroke-width': 1.5 },
							{
								fill: (t) => (turned(t) ? face : COLORS.chalk),
								stroke: (t) => (turned(t) ? (c.glue ? COLORS.pink : COLORS.chalk) : COLORS.chalk),
							},
						) +
							el(
								'text',
								{
									x: 0,
									y: 1,
									'font-family': SANS,
									'font-size': phone ? 17 : 16,
									'font-weight': 700,
									'text-anchor': 'middle',
									'dominant-baseline': 'central',
								},
								{
									fill: (t) => (turned(t) ? ink : COLORS.ink),
								},
								c.mark,
							),
					),
				),
			);
		});
		groups.forEach((g) =>
			out.push(
				label(el, x0 + gridW, g.labelY, g.total, {
					size: phone ? 15 : 16,
					anchor: 'end',
					color: COLORS.pink,
					anims: { opacity: (t) => (t >= g.done ? 1 : 0) },
				}),
			),
		);
		let kx = x0;
		keyItems.forEach(([fill, , stroke, text], i) => {
			const ky = phone ? keyY + i * 24 : keyY;
			if (phone) kx = x0;
			out.push(
				el('path', {
					d: tornRect(kx + 8, ky, 16, 16, 90 + i),
					fill,
					stroke: stroke ?? fill,
					'stroke-width': 1.5,
				}),
			);
			out.push(label(el, kx + 24, ky, text, { size: 14, anchor: 'start', weight: 600 }));
			kx += 24 + text.length * 7.4 + 26;
		});
		return out.join('');
	});
}

export const desktop = { height: 330, draw: (f) => chart(f, { W: 640, H: 330, phone: false }) };
export const phone = { height: 490, draw: (f) => chart(f, { W: 360, H: 490, phone: true }) };
