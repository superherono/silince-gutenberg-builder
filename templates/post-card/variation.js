/**
 * {{BLOCK_TITLE}} — Query Loop Variations (config-driven)
 *
 * Registers one core/query variation per entry in the PHP config, localized
 * onto `window.{{NAMESPACE}}PostCardConfigs` by init.php.
 *
 * Add/remove a CPT entirely in PHP (the `{{NAMESPACE}}_post_card_configs`
 * filter) — this file never needs to change.
 *
 * Raw IIFE (not bundled by wp-scripts): enqueued directly from init.php on
 * `enqueue_block_editor_assets`.
 *
 * @package {{TEXTDOMAIN}}_Theme
 */

(function (wp) {
	if (!wp || !wp.blocks) {
		return;
	}

	const { registerBlockVariation } = wp.blocks;
	const configs = window.{{NAMESPACE}}PostCardConfigs || {};

	Object.keys(configs).forEach(function (key) {
		const cfg = configs[key];
		const namespace = '{{NAMESPACE}}/' + key + '-loop';
		const columns = parseInt(cfg.columns, 10) || 3;
		const perPage = parseInt(cfg.perPage, 10) || 6;

		registerBlockVariation('core/query', {
			name: namespace,
			title: cfg.title || key,
			description: cfg.description || '',
			icon: cfg.icon || 'grid-view',

			attributes: {
				namespace: namespace,
				query: {
					postType: cfg.postType || 'post',
					perPage: perPage,
					pages: 0,
					offset: 0,
					order: 'desc',
					orderBy: 'date',
					inherit: false,
				},
			},

			innerBlocks: [
				[
					'core/post-template',
					{ layout: { type: 'grid', columnCount: columns } },
					[['{{NAMESPACE}}/post-card', { postType: cfg.postType || 'post', taxonomy: cfg.taxonomy || '' }]],
				],
				[
					'core/query-pagination',
					{ layout: { type: 'flex', justifyContent: 'center' } },
					[['core/query-pagination-previous'], ['core/query-pagination-numbers'], ['core/query-pagination-next']],
				],
				[
					'core/query-no-results',
					{},
					[['core/paragraph', { align: 'center', content: cfg.noResults || 'Nothing found.' }]],
				],
			],

			scope: ['inserter'],
			isActive: ['namespace'],
			allowedControls: ['order', 'taxQuery', 'search', 'sticky'],
		});
	});
})(window.wp);
