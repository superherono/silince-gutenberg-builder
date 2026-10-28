/**
 * WordPress dependencies
 */
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save() {
	// The chosen layout style (`is-style-*`) is merged in from the block's
	// className attribute by useBlockProps.save — no attribute of our own.
	const blockProps = useBlockProps.save( { className: 'block-before-after' } );

	return (
		<section { ...blockProps }>
			<div className="block-before-after__container">
				<div className="block-before-after__layout">
					<InnerBlocks.Content />
				</div>
			</div>
		</section>
	);
}
