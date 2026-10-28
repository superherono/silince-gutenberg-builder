/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { INNER_BLOCKS } from './inner-blocks';

const ALLOWED_BLOCKS = [
	'core/group',
	'core/paragraph',
	'integroflow/custom-heading',
	'integroflow/ba-row',
];

export default function Edit() {
	// The active layout is a native block style; WordPress merges its
	// `is-style-*` class into blockProps automatically, so nothing to wire here.
	const blockProps = useBlockProps( { className: 'block-before-after' } );

	// Spread InnerBlocks directly onto `__layout` (no wrapper div) so the grid
	// applies to the heading / body columns identically in editor and front.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'block-before-after__layout' },
		{
			template: INNER_BLOCKS,
			allowedBlocks: ALLOWED_BLOCKS,
			templateLock: false,
		}
	);

	return (
		<section { ...blockProps }>
			<div className="block-before-after__container">
				<div { ...innerBlocksProps } />
			</div>
		</section>
	);
}
