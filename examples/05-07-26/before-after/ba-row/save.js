/**
 * WordPress dependencies
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { before, after } = attributes;
	const blockProps = useBlockProps.save( { className: 'block-ba-row' } );

	return (
		<div { ...blockProps }>
			<div className="block-ba-row__cell block-ba-row__cell--before">
				<svg
					className="block-ba-row__icon block-ba-row__icon--before"
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					aria-hidden="true"
				>
					<path d="M4 4l8 8M12 4L4 12" />
				</svg>
				<RichText.Content
					tagName="span"
					className="block-ba-row__text block-ba-row__text--before"
					value={ before }
				/>
			</div>
			<div className="block-ba-row__cell block-ba-row__cell--after">
				<span className="block-ba-row__badge" aria-hidden="true">
					<svg
						className="block-ba-row__icon block-ba-row__icon--after"
						width="12"
						height="12"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M3 8l3.5 3.5L13 5" />
					</svg>
				</span>
				<RichText.Content
					tagName="span"
					className="block-ba-row__text block-ba-row__text--after"
					value={ after }
				/>
			</div>
		</div>
	);
}
