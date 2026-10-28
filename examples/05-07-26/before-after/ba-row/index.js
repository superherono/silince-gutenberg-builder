/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

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
