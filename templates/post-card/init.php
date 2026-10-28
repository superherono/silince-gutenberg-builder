<?php

/**
 * {{BLOCK_TITLE}} — module bootstrap.
 *
 * Self-contained wiring for the `{{NAMESPACE}}/post-card` block:
 *   1. The card config (which post types get a Query Loop variation).
 *   2. Generic data helpers (excerpt, thumbnail, default taxonomy).
 *   3. Enqueue + localize the Query Loop variations (variation.js).
 *   4. Register one block pattern per configured post type.
 *
 * Portability: copy the whole `post-card` folder into a theme/plugin and add a
 * single `include` of this file. Nothing here is hard-wired to a specific CPT —
 * the default config targets the built-in `post`. Point it at any CPT through
 * the `{{NAMESPACE}}_post_card_configs` filter and feed KPI metrics through the
 * `{{NAMESPACE}}_post_card_stats` filter (see README.md).
 *
 * @package {{TEXTDOMAIN}}_Theme
 */

if (! defined('ABSPATH')) {
	exit;
}

/* -------------------------------------------------------------------------
 * 1. Configuration — single source of truth
 * ---------------------------------------------------------------------- */

if (! function_exists('{{NAMESPACE}}_post_card_configs')) {
	function {{NAMESPACE}}_post_card_configs()
	{
		$defaults = array(
			'posts' => array(
				'postType'    => 'post',
				'taxonomy'    => 'category',
				'title'       => __('Posts Loop', '{{TEXTDOMAIN}}'),
				'description' => __('Display posts as cards.', '{{TEXTDOMAIN}}'),
				'icon'        => 'grid-view',
				'columns'     => 3,
				'perPage'     => 6,
				'noResults'   => __('No posts found.', '{{TEXTDOMAIN}}'),
			),
		);

		return apply_filters('{{NAMESPACE}}_post_card_configs', $defaults);
	}
}

/* -------------------------------------------------------------------------
 * 2. Generic data helpers
 * ---------------------------------------------------------------------- */

if (! function_exists('{{NAMESPACE}}_post_card_default_taxonomy')) {
	function {{NAMESPACE}}_post_card_default_taxonomy($post_type)
	{
		foreach ({{NAMESPACE}}_post_card_configs() as $cfg) {
			if (! empty($cfg['postType']) && $cfg['postType'] === $post_type && ! empty($cfg['taxonomy'])) {
				return $cfg['taxonomy'];
			}
		}

		if ('post' === $post_type) {
			return 'category';
		}

		$taxonomies = get_object_taxonomies($post_type, 'names');
		$taxonomies = array_diff((array) $taxonomies, array('post_format'));

		return $taxonomies ? (string) reset($taxonomies) : '';
	}
}

if (! function_exists('{{NAMESPACE}}_post_card_excerpt')) {
	function {{NAMESPACE}}_post_card_excerpt($post_id = null, $words = 18)
	{
		if (! $post_id) {
			$post_id = get_the_ID();
		}

		$excerpt = get_the_excerpt($post_id);

		if (empty($excerpt)) {
			$excerpt = wp_trim_words(get_the_content(null, false, $post_id), $words);
		}

		return $excerpt;
	}
}

if (! function_exists('{{NAMESPACE}}_post_card_thumbnail')) {
	function {{NAMESPACE}}_post_card_thumbnail($post_id = null, $size = 'large')
	{
		if (! $post_id) {
			$post_id = get_the_ID();
		}

		if (has_post_thumbnail($post_id)) {
			return get_the_post_thumbnail($post_id, $size);
		}

		return apply_filters('{{NAMESPACE}}_post_card_thumbnail_fallback', '', $post_id, $size);
	}
}

/* -------------------------------------------------------------------------
 * 3. Query Loop variations (editor) — config localized to variation.js
 * ---------------------------------------------------------------------- */

if (! function_exists('{{NAMESPACE}}_post_card_enqueue_variation')) {
	function {{NAMESPACE}}_post_card_enqueue_variation()
	{
		$script_path = __DIR__ . '/variation.js';

		if (! file_exists($script_path)) {
			return;
		}

		// Resolve the public URL relative to the theme root, so the module keeps
		// working if the folder is moved within the theme.
		// In a PLUGIN, replace the two lines below with:
		//   $script_url = plugins_url('variation.js', __FILE__);
		$theme_dir  = wp_normalize_path(get_template_directory());
		$rel_dir    = dirname(substr(wp_normalize_path(__FILE__), strlen($theme_dir)));
		$script_url = get_template_directory_uri() . $rel_dir . '/variation.js';

		wp_enqueue_script(
			'{{NAMESPACE}}-post-card-variation',
			$script_url,
			array('wp-blocks', 'wp-dom-ready'),
			filemtime($script_path),
			true
		);

		wp_add_inline_script(
			'{{NAMESPACE}}-post-card-variation',
			'window.{{NAMESPACE}}PostCardConfigs = ' . wp_json_encode({{NAMESPACE}}_post_card_configs()) . ';',
			'before'
		);
	}
	add_action('enqueue_block_editor_assets', '{{NAMESPACE}}_post_card_enqueue_variation');
}

/* -------------------------------------------------------------------------
 * 4. Block patterns — one per configured post type
 * ---------------------------------------------------------------------- */

if (! function_exists('{{NAMESPACE}}_post_card_register_patterns')) {
	function {{NAMESPACE}}_post_card_register_patterns()
	{
		if (! function_exists('register_block_pattern')) {
			return;
		}

		foreach ({{NAMESPACE}}_post_card_configs() as $key => $cfg) {
			$namespace  = '{{NAMESPACE}}/' . $key . '-loop';
			$post_type  = isset($cfg['postType']) ? $cfg['postType'] : 'post';
			$taxonomy   = isset($cfg['taxonomy']) ? $cfg['taxonomy'] : '';
			$columns    = isset($cfg['columns']) ? (int) $cfg['columns'] : 3;
			$per_page   = isset($cfg['perPage']) ? (int) $cfg['perPage'] : 6;
			$title      = isset($cfg['title']) ? $cfg['title'] : $key;
			$no_results = isset($cfg['noResults']) ? $cfg['noResults'] : __('Nothing found.', '{{TEXTDOMAIN}}');

			$card_attrs = wp_json_encode(array('postType' => $post_type, 'taxonomy' => $taxonomy));

			$content = '<!-- wp:query {"namespace":"' . esc_attr($namespace) . '","query":{"perPage":' . $per_page . ',"pages":0,"offset":0,"postType":"' . esc_attr($post_type) . '","order":"desc","orderBy":"date","inherit":false}} -->
<div class="wp-block-query">
    <!-- wp:post-template {"layout":{"type":"grid","columnCount":' . $columns . '}} -->
        <!-- wp:{{NAMESPACE}}/post-card ' . $card_attrs . ' /-->
    <!-- /wp:post-template -->

    <!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"center"}} -->
        <!-- wp:query-pagination-previous /-->
        <!-- wp:query-pagination-numbers /-->
        <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->

    <!-- wp:query-no-results -->
        <!-- wp:paragraph {"align":"center"} -->
        <p class="has-text-align-center">' . esc_html($no_results) . '</p>
        <!-- /wp:paragraph -->
    <!-- /wp:query-no-results -->
</div>
<!-- /wp:query -->';

			register_block_pattern(
				'{{NAMESPACE}}/' . $key . '-card-loop',
				array(
					'title'       => $title,
					'description' => isset($cfg['description']) ? $cfg['description'] : '',
					'categories'  => array('query'),
					'blockTypes'  => array('core/query/' . $namespace),
					'content'     => $content,
				)
			);
		}
	}
	add_action('init', '{{NAMESPACE}}_post_card_register_patterns');
}
