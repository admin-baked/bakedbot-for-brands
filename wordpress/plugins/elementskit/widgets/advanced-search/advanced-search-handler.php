<?php
namespace Elementor;

class ElementsKit_Widget_Advanced_Search_Handler extends \ElementsKit_Lite\Core\Handler_Widget {

	static function get_name() {
		return 'elementskit-advanced-search';
	}

	static function get_title() {
		return esc_html__( 'Advanced Search', 'elementskit' );
	}

	static function get_icon() {
		return 'ekit ekit-widget-icon ekit-search';
	}

	static function get_categories() {
		return [ 'elementskit' ];
	}

	static function get_keywords() {
		return ['ekit', 'advanced', 'search', 'adv search'];
	}

	static function get_dir() {
		return \ElementsKit::widget_dir() . 'advanced-search/';
	}

	static function get_url() {
		return \ElementsKit::widget_url() . 'advanced-search/';
	}
	
	public function wp_init() {
		add_action('rest_api_init', function () {
			register_rest_route('elementskit/v1', 'advanced-search', [
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => [$this, 'get_the_search_result'],
			]);
		});
	}

	public function get_the_search_result($request) {
		$settings = $request->get_body_params();
		$form_data = $settings['formData'];
		wp_parse_str($form_data, $form_data);

		$query = new \ElementsKit\Widgets\Advanced_Search\Advanced_Search_Result();
		$query->get_search_query_result($form_data, $settings);
		exit();
	}
}