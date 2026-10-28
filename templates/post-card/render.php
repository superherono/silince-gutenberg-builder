<?php

/**
 * {{BLOCK_TITLE}} — render router (controller).
 *
 * Resolves the post and prepares the card data once, then delegates markup to
 * a per-post-type view template:
 *   - post-card-{post_type}.php  when that file exists in this folder
 *   - post-card.php              default fallback (and for `post`)
 *
 * Post-type agnostic: renders whatever post it is given (Query Loop context,
 * the main loop, or a manually selected post). Template resolution is relative
 * to __DIR__, so the module stays portable when moved within the theme/plugin.
 *
 * The root gets a `post-card--{post_type}` modifier class so per-type views can
 * be styled independently without touching this router.
 *
 * @package {{TEXTDOMAIN}}_Theme
 * @var array    $attributes Block attributes
 * @var string   $content    Block content
 * @var WP_Block $block      Block instance
 */

if (! defined('ABSPATH')) {
	exit;
}

$is_editor_preview = defined('REST_REQUEST') && REST_REQUEST;

// Resolve post id (no post-type gate — the card is post-type-agnostic).
// Editor: trust the explicit `postId` attribute (edit.js resolves Query Loop
// context into it). Front-end: the loop is authoritative, then block context,
// then the manual attribute.
$post_id = 0;

if ($is_editor_preview) {
	if (! empty($attributes['postId'])) {
		$post_id = absint($attributes['postId']);
	}
} elseif (in_the_loop()) {
	$post_id = get_the_ID();
} elseif (! empty($block->context['postId'])) {
	$post_id = absint($block->context['postId']);
} elseif (! empty($attributes['postId'])) {
	$post_id = absint($attributes['postId']);
}

if (! $post_id) {
	return;
}

$post_type   = get_post_type($post_id);
$post_status = get_post_status($post_id);

// Only published posts on the front-end; allow any status to preview in editor.
if (! $is_editor_preview && 'publish' !== $post_status) {
	return;
}

// Resolve the pill taxonomy: explicit attribute > sensible default for the type.
$taxonomy = ! empty($attributes['taxonomy'])
	? $attributes['taxonomy']
	: {{NAMESPACE}}_post_card_default_taxonomy($post_type);

// Post data.
$post_title   = get_the_title($post_id);
$post_url     = get_permalink($post_id);
$post_excerpt = {{NAMESPACE}}_post_card_excerpt($post_id, 22);
$thumbnail    = {{NAMESPACE}}_post_card_thumbnail($post_id, 'large');

// Pill text — first two terms of the configured taxonomy; year as fallback.
$term_one = '';
$term_two = '';

if ($taxonomy && taxonomy_exists($taxonomy)) {
	$terms = get_the_terms($post_id, $taxonomy);

	if (! empty($terms) && ! is_wp_error($terms)) {
		$terms    = array_values($terms);
		$term_one = isset($terms[0]) ? $terms[0]->name : '';
		$term_two = isset($terms[1]) ? $terms[1]->name : '';
	}
}

if (! $term_two) {
	$term_two = get_the_date('Y', $post_id);
}

$pill_text = implode(' · ', array_filter(array($term_one, $term_two)));

// KPI stats — provided per post type via filter. Default: none.
// Each row: [ 'stat_number' => string, 'stat_label' => string, 'stat_label_short' => string ].
$stats = apply_filters('{{NAMESPACE}}_post_card_stats', array(), $post_id, $attributes);

if (! is_array($stats)) {
	$stats = array();
}

// In the editor render as a non-interactive <div>; on the front-end a clickable <a>.
$tag = $is_editor_preview ? 'div' : 'a';

// Root class carries a per-type modifier so per-type views can be styled alone.
$wrapper_attributes = get_block_wrapper_attributes(array(
	'class' => 'post-card post-card--' . sanitize_html_class($post_type),
));

// View data — raw values; templates handle escaping on output.
$data = array(
	'post_id'            => $post_id,
	'post_type'          => $post_type,
	'tag'                => $tag,
	'is_editor_preview'  => $is_editor_preview,
	'url'                => $post_url,
	'wrapper_attributes' => $wrapper_attributes,
	'thumbnail'          => $thumbnail,
	'pill_text'          => $pill_text,
	'title'              => $post_title,
	'excerpt'            => $post_excerpt,
	'stats'              => $stats,
	'taxonomy'           => $taxonomy,
	'attributes'         => $attributes,
);

// Select the per-type template, falling back to the default. Resolve strictly
// inside this module folder; sanitize the type as defense-in-depth.
$type_template = __DIR__ . '/post-card-' . sanitize_key($post_type) . '.php';
$template      = file_exists($type_template) ? $type_template : __DIR__ . '/post-card.php';

include $template;
