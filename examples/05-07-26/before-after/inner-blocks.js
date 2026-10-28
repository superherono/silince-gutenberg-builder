/**
 * InnerBlocks seed for the Before / After block.
 *
 * The two layouts (Ledger / Split) are native block styles — they share the
 * SAME DOM and content and are switched by the `is-style-*` class WordPress
 * adds from the block's Styles panel. So there is ONE seed; the whole look is
 * driven in style.scss (base = ledger, `&.is-style-split` = split).
 *
 * @package
 */

/**
 * The five before → after pairs shown in the comparison. Editable per instance;
 * this is only the seed content used when the block is inserted.
 *
 * @type {Array<[string, string]>}
 */
const PAIRS = [
	[ 'Reply to an inquiry after 6+ hours', 'Automatic reply in 5 minutes' ],
	[ '3 hours/day on copy-paste replies', '0 — sent automatically' ],
	[
		'«I forgot to call them back» follow-up',
		'Automatic reminder at the right moment',
	],
	[
		"You don't know how many inquiries were lost",
		'Full visibility, no inquiry slips through',
	],
	[ 'Excel file no one keeps updated', 'A record that updates itself' ],
];

/**
 * Heading column — identical in both variants.
 *
 * @return {Array} A `core/group` inner-block definition.
 */
const head = () => [
	'core/group',
	{
		className: 'block-before-after__head',
		layout: { type: 'default' },
		style: { spacing: { blockGap: '0' } },
	},
	[
		[
			'core/paragraph',
			{
				className: 'block-before-after__eyebrow if-eyebrow',
				content: 'Before vs after',
			},
		],
		[
			'integroflow/custom-heading',
			{
				level: 2,
				fontSize: 'M',
				textAlign: 'left',
				className: 'block-before-after__title',
				content: 'Less routine, more customers, <em>nothing dropped.</em>',
			},
		],
	],
];

/**
 * Body column — the two column labels followed by the before/after rows.
 *
 * @param {string} beforeLabel Label above the "before" column.
 * @param {string} afterLabel  Label above the "after" column.
 * @return {Array} A `core/group` inner-block definition.
 */
const body = ( beforeLabel, afterLabel ) => [
	'core/group',
	{
		className: 'block-before-after__body',
		layout: { type: 'default' },
		style: { spacing: { blockGap: '0' } },
	},
	[
		[
			'core/group',
			{
				className: 'block-before-after__labels',
				layout: { type: 'default' },
				style: { spacing: { blockGap: '0' } },
			},
			[
				[
					'core/paragraph',
					{
						className:
							'block-before-after__label block-before-after__label--before',
						content: beforeLabel,
					},
				],
				[
					'core/paragraph',
					{
						className:
							'block-before-after__label block-before-after__label--after',
						content: afterLabel,
					},
				],
			],
		],
		...PAIRS.map( ( [ before, after ] ) => [
			'integroflow/ba-row',
			{ before, after },
		] ),
	],
];

/**
 * The single seed used on insert. The column labels read fine in both styles
 * and stay editable per instance.
 */
export const INNER_BLOCKS = [
	head(),
	body( 'Today, by hand', 'With automation' ),
];
