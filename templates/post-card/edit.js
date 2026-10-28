/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Notice } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import ServerSideRender from '@wordpress/server-side-render';

export default function Edit({ attributes, setAttributes, context }) {
	const { postId, postType, taxonomy } = attributes;

	// A Query Loop exposes `queryId` to its descendants. Use it to tell a real
	// loop apart from a standalone card on a page (a page also provides a
	// `postId` context — the page itself — which we must NOT render).
	const inQueryLoop = context?.queryId !== undefined && !!context?.postId;

	const effectivePostId = inQueryLoop ? context.postId : postId;
	const effectivePostType = inQueryLoop ? context.postType || postType : postType;

	// Selectable public post types (standalone mode only).
	const postTypeOptions = useSelect((select) => {
		const types = select('core').getPostTypes({ per_page: -1 }) || [];
		return types
			.filter((type) => type.viewable && type.slug !== 'attachment')
			.map((type) => ({ label: type.name, value: type.slug }));
	}, []);

	// Taxonomies attached to the chosen post type (for the pill).
	const taxonomyOptions = useSelect(
		(select) => {
			const taxes = select('core').getTaxonomies({ per_page: -1 }) || [];
			return taxes
				.filter((tax) => tax.types?.includes(postType))
				.map((tax) => ({ label: tax.name, value: tax.slug }));
		},
		[postType]
	);

	// Posts of the chosen type for the standalone selector.
	const posts = useSelect(
		(select) => {
			if (inQueryLoop || !postType) {
				return [];
			}
			return select('core').getEntityRecords('postType', postType, {
				per_page: -1,
				status: 'publish',
				orderby: 'date',
				order: 'desc',
			});
		},
		[postType, inQueryLoop]
	);

	const blockProps = useBlockProps({
		className: 'wp-block-{{NAMESPACE}}-post-card',
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Post Card Settings', '{{TEXTDOMAIN}}')} initialOpen={true}>
					{inQueryLoop ? (
						<Notice status='info' isDismissible={false}>
							{__('Rendered from a Query Loop. Post ID: ', '{{TEXTDOMAIN}}') + effectivePostId}
						</Notice>
					) : (
						<>
							<SelectControl
								label={__('Post Type', '{{TEXTDOMAIN}}')}
								value={postType}
								options={postTypeOptions.length ? postTypeOptions : [{ label: postType, value: postType }]}
								onChange={(value) => setAttributes({ postType: value, postId: 0 })}
								help={__('Which post type this card pulls from when used standalone.', '{{TEXTDOMAIN}}')}
							/>

							<SelectControl
								label={__('Select Entry', '{{TEXTDOMAIN}}')}
								value={postId}
								options={[
									{ label: __('— Select an entry —', '{{TEXTDOMAIN}}'), value: 0 },
									...(posts || []).map((post) => ({
										label: post.title?.rendered || `#${post.id}`,
										value: post.id,
									})),
								]}
								onChange={(value) => setAttributes({ postId: parseInt(value, 10) || 0 })}
								help={__('Not needed inside a Query Loop.', '{{TEXTDOMAIN}}')}
							/>
						</>
					)}

					<SelectControl
						label={__('Pill Taxonomy', '{{TEXTDOMAIN}}')}
						value={taxonomy}
						options={[{ label: __('Auto (default for type)', '{{TEXTDOMAIN}}'), value: '' }, ...taxonomyOptions]}
						onChange={(value) => setAttributes({ taxonomy: value })}
						help={__('Taxonomy whose first two terms build the pill. Leave on Auto for the type default.', '{{TEXTDOMAIN}}')}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				{effectivePostId > 0 ? (
					<ServerSideRender
						key={effectivePostId}
						block='{{NAMESPACE}}/post-card'
						attributes={{
							...attributes,
							postId: effectivePostId,
							postType: effectivePostType,
						}}
					/>
				) : (
					<div className='post-card__placeholder'>
						<p>{__('⚠️ Select an entry from the sidebar, or use this block inside a Query Loop.', '{{TEXTDOMAIN}}')}</p>
						<p style={{ fontSize: '0.85em', marginTop: '0.5rem', opacity: 0.7 }}>
							{__('Tip: insert a Query Loop, pick one of the "… Loop" variations, then drop this block into the post template.', '{{TEXTDOMAIN}}')}
						</p>
					</div>
				)}
			</div>
		</>
	);
}
