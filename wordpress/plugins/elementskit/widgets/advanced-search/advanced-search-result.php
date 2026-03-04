<?php

namespace ElementsKit\Widgets\Advanced_Search;

use Elementor\Utils;

defined('ABSPATH') || exit;
class Advanced_Search_Result
{
	// Query function
	public function get_search_query_result($form_data, $settings)
	{
		$category_term_id = isset($form_data['post_category']) ? $form_data['post_category'] : null;
		$tags_term_id     = isset($form_data['post_tag']) ? $form_data['post_tag'] : null;

		if ($category_term_id) {
			$category = get_term($category_term_id);
		}

		if ($tags_term_id) {
			$tags = get_term($tags_term_id);
		}

		if (isset($form_data['s'])) {
			$search_term = !empty($form_data['s']) ? sanitize_text_field(wp_unslash($form_data['s'])) : '';

			$query_data = [
				'post_type'      => !empty($settings['postType']) ? $settings['postType'] : [],
				'post_status'    => 'publish',
				'orderby'        => 'meta_value_num title',
				'order'          => $settings['order'],
				's'              => $search_term,
				'posts_per_page' => !empty($settings['postsPerPage']) ? $settings['postsPerPage'] : 5,
			];

			$tax_query = [];

			// Exclude categories
			if (!empty($settings['excludeCategory'])) {
				$tax_query[] = [
					'taxonomy' => 'category',
					'field'    => 'term_id',
					'terms'    => array_map('intval', (array) $settings['excludeCategory']),
					'operator' => 'NOT IN',
				];
			}

			// Include specific category from form
			if (isset($category) && !is_wp_error($category)) {
				$tax_query[] = [
					'taxonomy' => $category->taxonomy,
					'field'    => 'term_id',
					'terms'    => (int) $category_term_id,
					'operator' => 'IN',
				];
			}

			// Include specific tags from form
			if (isset($tags) && !is_wp_error($tags)) {
				$tax_query[] = [
					'taxonomy' => $tags->taxonomy,
					'field'    => 'term_id',
					'terms'    => (int) $tags_term_id,
					'operator' => 'IN',
				];
			}

			if (!empty($tax_query)) {
				$query_data['tax_query'] = $tax_query;
			}

			$result = new \WP_Query($query_data);
			wp_reset_postdata();

			// Update popular keywords + render results
			self::get_update_popular_keywords($settings, $search_term);
			self::get_render_search_results($result, $search_term, $settings);
		}
	}

	function get_update_popular_keywords($settings, $search_term)
	{

		if (isset($settings['postType'])) {
			$popular_keywords = (array) get_option('ekit_advanced_search_popular_keyword', true);
			$search_term = strtolower(str_replace(' ', '_', $search_term));

			if (strlen($search_term) >= 4) {
				$popular_keywords[$search_term] = ($popular_keywords[$search_term] ?? 1) + 1;
				// add_option( 'ekit_popular_keyword', $popular_keywords );
				update_option('ekit_advanced_search_popular_keyword', $popular_keywords);
			}
		}
	}

	public function get_render_search_results($result, $search_term, $settings)
	{
		if ($result->have_posts()) : ?>
			<div data-posts-count="<?php echo esc_attr($result->found_posts);?>">
				<span class="ekit-search-total">
					<?php echo sprintf(
						$settings['resultLabel'],
						number_format_i18n($result->found_posts),
						esc_html($search_term),
					); ?>
				</span>
				<ul>
					<?php while ($result->have_posts()) : $result->the_post();
						$id				= esc_attr(get_the_ID());
						$title 			= get_the_title($id);
						$excerpt		= wp_kses(get_the_content($id), \ElementsKit_Lite\Utils::get_kses_array());
						$permalink		= get_the_permalink($id);
						$alt			= wp_strip_all_tags(get_post_meta(get_post_thumbnail_id($id), '_wp_attachment_image_alt', true));
						$image			= has_post_thumbnail() ? wp_get_attachment_image_src(get_post_thumbnail_id(get_the_ID()), 'single-post-thumbnail') : (get_post_type() == 'attachment' ? wp_get_attachment_image_src(get_the_ID(), 'thumbnail', true) : ''); ?>
						<li class="ekit-result-item">
							<a href="<?php echo esc_url($permalink) ?>">
								<div class="ekit-result-content">
									<?php if ($settings['showThumbnail'] === 'yes') : ?>
										<div class="ekit-result-thumb">
											<img src="<?php echo is_array($image) ? current($image) : Utils::get_placeholder_image_src() ?>" alt="<?php echo esc_attr_e($alt, 'elementskit'); ?>">
										</div>
									<?php endif; ?>
									<div class="ekit-result-title-and-excerpt">
										<h4 class="ekit-result-title"> <?php echo esc_html__($title, 'elementskit'); ?> </h4>
										<?php if ($settings['showContent'] === 'yes') : ?>
											<p class="ekit-result-excerpt"> <?php echo wp_trim_words($excerpt, 12, '...'); ?> </p>
										<?php endif; ?>
									</div>
								</div>
								<?php echo $settings['searchIcon']; ?>
							</a>
						</li>

					<?php endwhile;
					wp_reset_query();
					wp_reset_postdata(); ?>
				</ul>
			</div>
		<?php else :; ?>
			<?php self::get_no_search_found($search_term, $settings); ?>
		<?php endif;
	}
	public function get_no_search_found($search_term, $settings)
	{
		?>
		<div class="ekit-no-search-found" data-search-found="<?php echo esc_attr($search_term); ?>">
			<div class="ekit-search-icon">
				<svg width="40" height="40" viewBox="0 0 20 20" fill="none"
					fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
					<path
						d="M15.5 4.8c2 3 1.7 7-1 9.7h0l4.3 4.3-4.3-4.3a7.8 7.8 0 01-9.8 1m-2.2-2.2A7.8 7.8 0 0113.2 2.4M2 18L18 2">
					</path>
				</svg>
			</div>
			<p class="ekit-no-result-title">No results for "<strong> <?php echo esc_html__($search_term, 'elementskit'); ?> </strong>"</p>
			<div class="ekit-search-keyword-help">
				<p class="ekit-search-help">Try searching for:</p>
				<?php
				$popular_keywords =  (array) get_option('ekit_advanced_search_popular_keyword', true);
				if (empty($popular_keywords) || count($popular_keywords) < 2) {
					return;
				}

				arsort($popular_keywords);
				$popular_keywords_html = '';
				$rank                  = $settings['keywordsRank'];
				$limit                 = $settings['keywordsLimit'];
				foreach (array_slice($popular_keywords, 1, $limit) as $key => $item) {
					if ($item <= $rank) {
						continue;
					}
					$keyword        = ucfirst(str_replace('_', ' ', $key));
					$data_id        = uniqid();
					$keyword_html   = sprintf('<li><a href="javascript:void(0)" class="ekit-keyword" id="%2$s" data-id="%2$s" data-keyword="%1$s">%1$s</a></li>', $keyword, $data_id);
					$popular_keywords_html .= $keyword_html;
				}
				if (! empty($popular_keywords_html)) : ?>
					<ul class="ekit-keyword-list"> <?php echo $popular_keywords_html; ?> </ul>
				<?php endif; ?>
			</div>
		</div>
<?php
	}
}
