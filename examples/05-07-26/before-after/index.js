/**
 * WordPress dependencies
 */
import { registerBlockType, registerBlockStyle } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';
import metadata from './block.json';

/**
 * Block styles
 */
import './style.scss';
import './editor.scss';

registerBlockType( metadata.name, {
	...metadata,
	edit,
	save,
} );

/**
 * Two layout styles of ONE block — a single inserter card, the layout switched
 * from the native Styles panel in the block sidebar. Both styles render the
 * same DOM; WordPress adds `is-style-{name}` to the root and style.scss does the
 * rest (base = ledger, `&.is-style-split` = split).
 */
registerBlockStyle( metadata.name, {
	name: 'ledger',
	label: __( 'Ledger', 'integroflow' ),
	isDefault: true,
} );

registerBlockStyle( metadata.name, {
	name: 'split',
	label: __( 'Split', 'integroflow' ),
} );
