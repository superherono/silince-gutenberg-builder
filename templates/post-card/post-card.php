<?php

/**
 * {{BLOCK_TITLE}} — default view template (NEUTRAL skeleton).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ A neutral skeleton: it demonstrates the $data contract from render.php.  │
 * │ Block generator OVERWRITES this markup for the project design (and adds  │
 * │ per-type post-card-{type}.php). KEEP the $data contract and escaping.    │
 * │ Design (colors/typography/spacing) — in style.scss, using theme aliases. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Thin view: presentation only. Data prep lives in render.php; escape on output.
 *
 * @package {{TEXTDOMAIN}}_Theme
 * @var array $data Prepared card data (see render.php):
 *   post_id, post_type, tag, is_editor_preview, url, wrapper_attributes,
 *   thumbnail, pill_text, title, excerpt, stats, taxonomy, attributes.
 */

if (! defined('ABSPATH')) {
	exit;
}
?>
<<?php echo $data['tag']; ?><?php echo $data['is_editor_preview'] ? '' : ' href="' . esc_url($data['url']) . '"'; ?> <?php echo $data['wrapper_attributes']; ?>>
	<div class="post-card__thumbnail">
		<?php if ($data['thumbnail']) : ?>
			<?php echo wp_kses_post($data['thumbnail']); ?>
		<?php endif; ?>

		<?php if ($data['pill_text']) : ?>
			<span class="post-card__pill"><?php echo esc_html($data['pill_text']); ?></span>
		<?php endif; ?>
	</div>

	<div class="post-card__body">
		<h3 class="post-card__title"><?php echo esc_html($data['title']); ?></h3>

		<?php if ($data['excerpt']) : ?>
			<p class="post-card__summary"><?php echo esc_html($data['excerpt']); ?></p>
		<?php endif; ?>

		<?php if (! empty($data['stats'])) : ?>
			<footer class="post-card__metrics">
				<?php foreach ($data['stats'] as $stat) :
					$stat_number = isset($stat['stat_number']) ? $stat['stat_number'] : '';
					$stat_label  = isset($stat['stat_label_short']) && ! empty($stat['stat_label_short'])
						? $stat['stat_label_short']
						: (isset($stat['stat_label']) ? $stat['stat_label'] : '');

					if (empty($stat_number)) {
						continue;
					}
				?>
					<div class="post-card__metric">
						<span class="post-card__metric-value"><?php echo esc_html($stat_number); ?></span>
						<?php if ($stat_label) : ?>
							<span class="post-card__metric-label"><?php echo esc_html($stat_label); ?></span>
						<?php endif; ?>
					</div>
				<?php endforeach; ?>
			</footer>
		<?php endif; ?>
	</div>
</<?php echo $data['tag']; ?>>
