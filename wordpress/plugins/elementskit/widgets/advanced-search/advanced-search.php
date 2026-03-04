<?php

namespace Elementor;

use \Elementor\ElementsKit_Widget_Advanced_Search_Handler as Handler;
use \ElementsKit_Lite\Modules\Controls\Controls_Manager as ElementsKit_Controls_Manager;

defined('ABSPATH') || exit;

class ElementsKit_Widget_Advanced_Search extends Widget_Base
{
	use \ElementsKit_Lite\Widgets\Widget_Notice;

	public function get_name()
	{
		return Handler::get_name();
	}

	public function get_title()
	{
		return Handler::get_title();
	}

	public function get_icon()
	{
		return Handler::get_icon();
	}

	public function get_categories()
	{
		return Handler::get_categories();
	}

	public function get_keywords()
	{
		return Handler::get_keywords();
	}

	public function get_help_url()
	{
		return 'https://wpmet.com/doc/advanced-search/';
	}

	protected function register_controls()
	{

		$this->start_controls_section(
			'ekit_adv_section_search_field',
			[
				'label' => esc_html__('Search Field', 'elementskit'),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'ekit_adv_search_style',
			[
				'label' => esc_html__('Style Select', 'elementskit'),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'default' => esc_html__('Default', 'elementskit'),
					'modern' => esc_html__('Modern', 'elementskit'),
					'click-expand' => esc_html__('Click Expand', 'elementskit'),
					// 'modal-open' => esc_html__('Modal Open', 'elementskit'),
				],
				'default' => 'default',
				'render_type' => 'template',
				'prefix_class' => 'ekit-advanced-search-style-',
			]
		);
		$this->add_control(
			'ekit_adv_section_search_placeholder',
			[
				'label' => esc_html__('Placeholder', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('Search for Anything ...', 'elementskit'),
				'placeholder' => esc_html__('Search for Anything ...', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_placeholder_show_icon',
			[
				'label'        => esc_html__('Show Placeholder Icon', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'ekit_adv_search_placeholder_icon',
			[
				'label' => esc_html__('Placeholder Icon', 'elementskit'),
				'type' => Controls_Manager::ICONS,
				'default' => [
					'value' => 'icon icon-magnifying-glass-search',
					'library' => 'ekiticons',
				],
				'condition'   => [
					'ekit_adv_search_placeholder_show_icon' => 'yes'
				],
			]
		);
		$this->add_control(
			'ekit_adv_search_placeholder_icon_position',
			[
				'label' => esc_html__('Icon Position', 'elementskit'),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'row' => esc_html__('Before', 'elementskit'),
					'row-reverse' => esc_html__('After', 'elementskit'),
				],
				'default' => 'row',
				'condition'   => [
					'ekit_adv_search_placeholder_show_icon' => 'yes'
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search' => 'flex-direction: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_section_search_categories',
			[
				'label' => esc_html__('Categories', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('All Categories', 'elementskit'),
				'placeholder' => esc_html__('All Categories', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
			]
		);

		$this->add_control(
			'ekit_adv_section_search_tags',
			[
				'label' => esc_html__('Tags', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('All Tags', 'elementskit'),
				'placeholder' => esc_html__('All Tags', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
			]
		);

		$this->add_control(
			'ekit_adv_section_search_button',
			[
				'label' => esc_html__('Button', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('Search', 'elementskit'),
				'placeholder' => esc_html__('Search', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_button_icon_show_icon',
			[
				'label'        => esc_html__('Show Button Icon', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'ekit_adv_search_button_icon',
			[
				'label' => esc_html__('Button Icon', 'elementskit'),
				'type' => Controls_Manager::ICONS,
				'default' => [
					'value' => 'icon icon-magnifying-glass-search',
					'library' => 'ekiticons',
				],
				'condition'   => [
					'ekit_adv_search_button_icon_show_icon' => 'yes'
				],
			]
		);
		$this->add_control(
			'ekit_adv_search_button_close_icon',
			[
				'label' => esc_html__('Close Icon', 'elementskit'),
				'type' => Controls_Manager::ICONS,
				'default' => [
					'value' => 'fas fa-times',
					'library' => 'fontawesome-solid',
				],
				'condition'   => [
					'ekit_adv_search_style' => 'click-expand'
				],
			]
		);

		$this->add_control(
			'ekit_adv_section_search_oder_by_position',
			[
				'label' => esc_html__('Order By Position', 'elementskit'),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'label_off' => esc_html__('Default', 'elementskit'),
				'label_on' => esc_html__('Custom', 'elementskit'),
				'return_value' => 'yes',
			]
		);

		$this->start_popover();
		$this->add_control(
			'ekit_adv_search_order_by_field',
			[
				'label' => esc_html__('Order By Field', 'elementskit'),
				'type' => Controls_Manager::NUMBER,
				'default' => 1,
				'min' => 0,
				'max' => 4,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search' => 'order: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_order_by_cats',
			[
				'label' => esc_html__('Order By Categories', 'elementskit'),
				'type' => Controls_Manager::NUMBER,
				'default' => 2,
				'min' => 0,
				'max' => 4,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-category' => 'order: {{VALUE}}',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_order_by_tags',
			[
				'label' => esc_html__('Order By Tags', 'elementskit'),
				'type' => Controls_Manager::NUMBER,
				'default' => 3,
				'min' => 0,
				'max' => 4,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-tag' => 'order: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_order_by_button',
			[
				'label' => esc_html__('Order By Button', 'elementskit'),
				'type' => Controls_Manager::NUMBER,
				'default' => 4,
				'min' => 0,
				'max' => 4,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit' => 'order: {{VALUE}}',
				],
			]
		);
		$this->end_popover();

		$this->add_control(
			'ekit_adv-search_gap',
			[
				'label' => esc_html__('Gap', 'elementskit'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', 'em', '%'],
				'range' => [
					'px' => [
						'max' => 100,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 5,
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option' => 'row-gap: {{SIZE}}{{UNIT}}; column-gap: {{SIZE}}{{UNIT}};',
				],
			]

		);
		$this->add_responsive_control(
			'ekit_adv_search_field_height',
			[
				'label'      => esc_html__('Height', 'elementskit'),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => ['px', 'vh'],
				'range'      => [
					'px' => [
						'max' => 1000,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 60,
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select-trigger' => 'height: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search' => 'height: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li button' => 'height: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select' => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);
		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_search_result',
			[
				'label' => esc_html__('Search Result', 'elementskit'),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'ekit_adv_show_thumbnail',
			[
				'label'        => esc_html__('Show thumbnail', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'ekit_adv_show_content',
			[
				'label'        => esc_html__('Show Content', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'ekit_adv_search_icon',
			[
				'label' => esc_html__('Icon', 'elementskit'),
				'type' => Controls_Manager::ICONS,
				'default' => [
					'value' => 'icon icon-right-arrow',
					'library' => 'ekiticons',
				],
			]
		);
		$this->add_control(
			'ekit_serach_footer',
			[
				'label'        => esc_html__('Show Footer', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);
		$this->add_control(
			'ekit_serach_load_more',
			[
				'label'        => esc_html__('Show Load More', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
				'condition'   => [
					'ekit_serach_footer' => 'yes'
				],
			]
		);
		$this->add_control(
			'ekit_search_load_more_button',
			[
				'label' => esc_html__('Load More', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('Load More', 'elementskit'),
				'placeholder' => esc_html__('Load More', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
				'condition'   => [
					'ekit_serach_load_more' => 'yes',
					'ekit_serach_footer' => 'yes',
				],
			]
		);

		$this->add_control(
			'ekit_search_by_copyright',
			[
				'label'        => esc_html__('Show Copyright', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'no',
				'condition'   => [
					'ekit_serach_footer' => 'yes'
				],
			]
		);

		$this->add_control(
			'ekit_search_in_copyright_url',
			[
				'label' => esc_html__('Copyright Url', 'elementskit'),
				'type' => Controls_Manager::URL,
				'placeholder' => esc_html__('https://wpmet.com', 'elementskit'),
				'options' => ['url', 'is_external', 'nofollow'],
				'default' => [
					'url' => 'https://wpmet.com',
					'is_external' => false,
					'nofollow' => false,
				],
				'label_block' => true,
				'condition'   => [
					'ekit_search_by_copyright' => 'yes',
					'ekit_serach_footer' => 'yes'
				],
			]
		);

		$this->add_control(
			'ekit_search_in_copyright_name',
			[
				'label' => esc_html__('Copyright Name', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'placeholder' => esc_html__('wpmet', 'elementskit'),
				'default' => esc_html__('wpmet', 'elementskit'),
				'label_block' => true,
				'dynamic' => [
					'active' => true,
				],
				'condition'   => [
					'ekit_search_by_copyright' => 'yes'
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_search_settings',
			[
				'label' => esc_html__('Settings', 'elementskit'),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'ekit_adv_search_post_type',
			[
				'label'       => esc_html__('Post Type', 'elementskit'),
				'type'        => Controls_Manager::SELECT2,
				'multiple'    => true,
				'label_block' => true,
				'options' => self::get_the_post_type(),
				'render_type' => 'template',
				'default' => ['post'],
			]
		);

		$this->add_control(
			'ekit_adv_search_per_page',
			[
				'label'       => esc_html__('Show Per Page Result', 'elementskit'),
				'type'        => Controls_Manager::NUMBER,
				'render_type' => 'template',
				'min' => 5,
				'max' => 50,
				'step' => 1,
				'default' => 5,
			]
		);

		$this->add_control(
			'ekit_adv_show_category',
			[
				'label'        => esc_html__('Show Category', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
				'condition' => [
					"ekit_adv_search_style" => ['default', 'modern'],
				],
			]
		);

		$this->add_control(
			'ekit_adv_use_exclude_include',
			[
				'label'        => esc_html__('Include/Exclude?', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
				'condition'   => [
					'ekit_adv_show_category' => 'yes',
				],
			]
		);

		$this->add_control(
			'ekit_adv_include_category',
			[
				'label'       => esc_html__('Include Category', 'elementskit'),
				'type'      => Controls_Manager::SELECT2,
				'label_block' => true,
				'multiple'    => true,
				'options' => self::get_the_category_type(),
				'default' => [' '],
				'render_type' => 'template',
				'condition'   => [
					'ekit_adv_show_category' => 'yes',
					'ekit_adv_use_exclude_include' => 'yes'
				],
			]
		);

		$this->add_control(
			'ekit_adv_exclude_category',
			[
				'label'       => esc_html__('Exclude Category', 'elementskit'),
				'type'      => Controls_Manager::SELECT2,
				'options'   => self::get_the_category_type(),
				'label_block' => true,
				'multiple'    => true,
				'default' => [' '],
				'render_type' => 'template',
				'condition'   => [
					'ekit_adv_show_category' => 'yes',
					'ekit_adv_use_exclude_include' => 'yes'
				],
			]
		);

		$this->add_control(
			'ekit_adv_show_category_display_notice',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => sprintf(
					'<span> <b>%1$s</b> %2$s <span>',
					esc_html__('Note:', 'elementskit'),
					esc_html__('You have the option to choose either a category from "Exclude Category" or "Include Category." Please note that using both options together is not allowed', 'elementskit'),
				),
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-warning',
				'show_label' => false,
				'label_block' => false,
				//'separator' => 'after',
				'condition'   => [
					'ekit_adv_show_category' => 'yes',
					'ekit_adv_use_exclude_include' => 'yes'
				],
			]
		);

		$this->add_control(
			'ekit_adv_show_tag',
			[
				'label'        => esc_html__('Show Tag', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
				'condition' => [
					"ekit_adv_search_style" => ['default', 'modern'],
				],
			]
		);
		$this->add_control(
			'ekit_adv_show_button',
			[
				'label'        => esc_html__('Show Button', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
			]
		);

		$this->add_control(
			'ekit_adv_show_popular_keyword',
			[
				'label'        => esc_html__('Show Popular Keywords', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'no',
			]
		);

		$this->add_control(
			'ekit_adv_show_popular_keyword_title',
			[
				'label' => esc_html__('Keywords Title', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('Popular Keywords: ', 'elementskit'),
				'placeholder' => esc_html__('Popular Keywords: ', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
				'condition' => [
					'ekit_adv_show_popular_keyword' => 'yes',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_total_label_show',
			[
				'label'        =>  esc_html__('Show Label', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'no',
			]
		);

		$this->add_control(
			'ekit_adv_search_total_label',
			[
				'label' => esc_html__('Total Result Label', 'elementskit'),
				'description' => esc_html__('%1$s = Totals Posts & %2$s = Search Term', 'elementskit'),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__('Results found for: %2$s', 'elementskit'),
				'placeholder' => esc_html__('Total %1$s Result', 'elementskit'),
				'dynamic' => [
					'active' => true,
				],
				'condition' => [
					'ekit_adv_search_total_label_show' => 'yes',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_popular_keywords_display',
			[
				'label'     => esc_html__('Keywords Display', 'elementskit'),
				'type'      => Controls_Manager::NUMBER,
				'min'       => 1,
				'max'		=> 10,
				'default'   => 5,
				'condition' => [
					'ekit_adv_show_popular_keyword' => 'yes',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_popular_keywords_display_notice',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => sprintf(
					'<span> <b>%1$s</b> %2$s <span>',
					esc_html__('Note:', 'elementskit'),
					esc_html__('Limit number of popular searches keyword to display.', 'elementskit'),
				),
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-warning',
				'show_label' => false,
				'label_block' => false,
				//'separator' => 'after',
				'condition' => [
					'ekit_adv_show_popular_keyword' => 'yes',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_most_popular_keyword_rank',
			[
				'label'       => esc_html__('Keywords Rank', 'elementskit'),
				'type'        => Controls_Manager::NUMBER,
				'default'     => 5,
				'min'         => 1,
				'condition'   => [
					'ekit_adv_show_popular_keyword' => 'yes',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_most_popular_keyword_notice',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => sprintf(
					'<span> <b>%1$s</b> %2$s <span>',
					esc_html__('Note:', 'elementskit'),
					esc_html__('The minimum number of searches for a keyword to be considered a popular search varies based on different factors such as search keyword.', 'elementskit'),
				),
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-warning',
				'show_label' => false,
				'label_block' => false,
				//'separator' => 'after',
				'condition' => [
					'ekit_adv_show_popular_keyword' => 'yes',
				]
			]
		);

		$this->add_control(
			'ekit_adv_search_body_enable_blur',
			[
				'label'        => esc_html__('Enable Blur', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'no',
			]
		);

		$this->add_control(
			'ekit-adv-search-loader_show',
			[
				'label'        => esc_html__('Show Loader', 'elementskit'),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__('Show', 'elementskit'),
				'label_off'    => esc_html__('Hide', 'elementskit'),
				'return_value' => 'yes',
				'default'      => 'yes',
				'selectors_dictionary' => [
					'' =>  'display: none;',
				],
				'selectors' => [
					'{{WRAPPER}}  .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-loader-closer' => '{{VALUE}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_search_field_style',
			[
				'label' => esc_html__('Search Field', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_search_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search .search-field',
			]
		);
		// default style
		$this->start_controls_tabs(
			'ekit_adv_search_field_style_tabs',
			[
				'condition' => [
					'ekit_adv_search_style!' => 'modern',
				],
			]
		);

		$this->start_controls_tab(
			'ekit_adv_style_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_field_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search .search-field' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_placeholder_text_color',
			[
				'label'     => esc_html__('Placeholder Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search .search-field::placeholder' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_field_border_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search',
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_field_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search',
			]
		);

		$this->end_controls_tab();
		$this->start_controls_tab(
			'ekit_adv_style_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_field_hover_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:hover .search-field' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_hover_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:hover' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_placeholder_hover_text_color',
			[
				'label'     => esc_html__('Placeholder Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:hover .search-field::placeholder' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_field_hover_border_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:hover',
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_field_hover_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:hover',
			]
		);

		$this->end_controls_tab();
		$this->start_controls_tab(
			'ekit_adv_style_focus_tab',
			[
				'label' => esc_html__('Focus', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_field_focus_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:focus-within .search-field' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_focus_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:focus-within' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_placeholder_focus_text_color',
			[
				'label'     => esc_html__('Placeholder Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:focus-within .search-field::placeholder' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_field_focus_border_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:focus-within',
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_field_focus_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search:focus-within',
			]
		);

		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'ekit_adv_search_field_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'ekit_adv_search_style!' => 'modern',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_field_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper li.ekit-search' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
				'condition' => [
					'ekit_adv_search_style!' => 'modern',
				],
			]
		);
		// Modern Style
		$this->start_controls_tabs(
			'ekit_adv_search_field_modern_tabs',
			[
				'condition' => [
					'ekit_adv_search_style' => 'modern',
				],
			]
		);

		$this->start_controls_tab(
			'ekit_adv_search_field_modern_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .search-field' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search' => 'background: {{VALUE}};',
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_placeholder_text_color',
			[
				'label'     => esc_html__('Placeholder Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .search-field::placeholder' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_field_modern_border_shadow',
				'selector' => '{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option',
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_field_modern_border',
				'selector' => '{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option',
			]
		);

		$this->end_controls_tab();
		$this->start_controls_tab(
			'ekit_adv_search_field_modern_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_hover_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search:hover .search-field' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_hover_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search:hover' => 'background: {{VALUE}};',
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option:hover' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_placeholder_hover_text_color',
			[
				'label'     => esc_html__('Placeholder Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search:hover .search-field::placeholder' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_field_modern_hover_border_shadow',
				'selector' => '{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option:hover',
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_field_modern_hover_border',
				'selector' => '{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option:hover',
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'ekit_adv_search_field_modern_focus_tab',
			[
				'label' => esc_html__('Focus', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_focus_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search:focus-within .search-field' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_focus_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search:focus-within' => 'background: {{VALUE}};',
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option:focus-within' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_field_modern_placeholder_focus_text_color',
			[
				'label'     => esc_html__('Placeholder Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search:focus-within .search-field::placeholder' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_field_modern_focus_border_shadow',
				'selector' => '{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option:focus-within',
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_field_modern_focus_border',
				'selector' => '{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option:focus-within',
			]
		);

		$this->end_controls_tab();
		$this->end_controls_tabs();
		$this->add_responsive_control(
			'ekit_adv_search_field_modern_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors'  => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'ekit_adv_search_style' => 'modern',
				],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_field_modern_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors'  => [
					'{{WRAPPER}}.ekit-advanced-search-style-modern .ekit-advanced-search-wrapper .ekit-advanced-search-option' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
				'condition' => [
					'ekit_adv_search_style' => 'modern',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_icon_heading',
			[
				'type'      => Controls_Manager::HEADING,
				'label'     => esc_html__('Icon', 'elementskit'),
				'separator' => 'before',
				'condition' => [
					'ekit_adv_search_placeholder_show_icon' => 'yes',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_icon_color',
			[
				'label'     => esc_html__('Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-plhdr-icon > i' => 'color: {{VALUE}};',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-plhdr-icon > svg' => 'fill: {{VALUE}};',
				],
				'condition' => [
					'ekit_adv_search_placeholder_show_icon' => 'yes',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_icon_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-plhdr-icon' => 'background-color: {{VALUE}};',
				],
				'condition' => [
					'ekit_adv_search_placeholder_show_icon' => 'yes',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_icon_size',
			[
				'label'      => esc_html__('Size', 'elementskit'),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => ['px'],
				'range'      => [
					'px' => [
						'max' => 200,
					],
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-plhdr-icon > i' => 'font-size: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-plhdr-icon > svg' => 'height: {{SIZE}}{{UNIT}}; width:{{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'ekit_adv_search_placeholder_show_icon' => 'yes',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_icon_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-search .ekit-adv-search-plhdr-icon' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
				'condition' => [
					'ekit_adv_search_placeholder_show_icon' => 'yes',
				],
			]
		);


		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_categories_tags_style',
			[
				'label' => esc_html__('Categories & Tags', 'elementskit'),
				'tab'   => Controls_Manager::TAB_STYLE,
				'conditions' => [
					'relation' => 'and',
					'terms'    => [
						[
							'relation' => 'or',
							'terms'    => [
								[
									'name'     => 'ekit_adv_show_category',
									'operator' => '===',
									'value'    => 'yes',
								],
								[
									'name'     => 'ekit_adv_show_tag',
									'operator' => '===',
									'value'    => 'yes',
								],
							],
						],
						[
							'name'     => 'ekit_adv_search_style',
							'operator' => 'in',
							'value'    => ['default', 'modern'],
						],
					],
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_categories_tags_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select :is(.select-trigger, .select-dropdown)',
			]
		);

		$this->start_controls_tabs(
			'ekit_adv_categories_tags_style_tabs'
		);

		$this->start_controls_tab(
			'ekit_adv_categories_tags_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_categories_tags_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger',
				'condition' => [
					'ekit_adv_search_style!' => 'mordern',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'ekit_adv_categories_tags_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);
		$this->add_control(
			'ekit_adv_categories_tags_hover_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger:hover' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_hover_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger:hover' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_categories_tags_hover_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger:hover',
				'condition' => [
					'ekit_adv_search_style!' => 'mordern',
				],
			]
		);

		$this->end_controls_tab();
		$this->start_controls_tab(
			'ekit_adv_categories_tags_focus_tab',
			[
				'label' => esc_html__('Focus', 'elementskit'),
				'condition' => [
					'ekit_adv_search_style!' => 'mordern',
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_focus_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger:focus-within' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_focus_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => 'rgba(247, 247, 247, 1)',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger:focus-within' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_categories_tags_focus_box_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger:focus-within',
			]
		);
		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'ekit_adv_categories_tags_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'ekit_adv_search_style!' => 'mordern',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_categories_tags_width',
			[
				'label'      => esc_html__('Width', 'elementskit'),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => ['px', 'em', '%'],
				'range'      => [
					'px' => [
						'min' => 50,
						'max' => 500,
					],
				],
				'default'    => [
					'unit' => 'px',
					'size' => 180,
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_categories_tags_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
				'condition' => [
					'ekit_adv_search_style!' => 'mordern',
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_icon_heading',
			[
				'type'      => Controls_Manager::HEADING,
				'label'     => esc_html__('Icon', 'elementskit'),
				'separator' => 'before',
				'condition' => [
					'ekit_adv_search_style' => ['default', 'modern'],
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_icon_color',
			[
				'label'     => esc_html__('Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger .arrow svg path' => 'stroke: {{VALUE}};',
				],
				'condition' => [
					'ekit_adv_search_style' => ['default', 'modern'],
				],
			]
		);

		$this->add_control(
			'ekit_adv_categories_tags_icon_size',
			[
				'label'      => esc_html__('Size', 'elementskit'),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => ['px'],
				'range'      => [
					'px' => [
						'max' => 200,
					],
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-trigger .arrow svg' => 'height: {{SIZE}}{{UNIT}}; width:{{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'ekit_adv_search_style' => ['default', 'modern'],
				],
			]
		);


		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_dropdown_options',
			[
				'label' => esc_html__('Dropdown Options', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
				'conditions' => [
					'relation' => 'and',
					'terms'    => [
						[
							'relation' => 'or',
							'terms'    => [
								[
									'name'     => 'ekit_adv_show_category',
									'operator' => '===',
									'value'    => 'yes',
								],
								[
									'name'     => 'ekit_adv_show_tag',
									'operator' => '===',
									'value'    => 'yes',
								],
							],
						],
						[
							'name'     => 'ekit_adv_search_style',
							'operator' => 'in',
							'value'    => ['default', 'modern'],
						],
					],
				],
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'ekit_adv_dropdown_bg',
				'label' => esc_html__('Background', 'elementskit'),
				'types' => ['classic', 'gradient'],
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown',
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_dropdown_border',
				'label' => esc_html__('Border', 'elementskit'),
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown',
			]
		);

		$this->add_control(
			'ekit_adv_dropdown_border_radius',
			[
				'label' => esc_html__('Border Radius', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_dropdown_box_shadow',
				'label' => esc_html__('Box Shadow', 'elementskit'),
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown',
			]
		);

		$this->add_responsive_control(
			'ekit_adv_dropdown_padding',
			[
				'label' => esc_html__('Padding', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);
		$this->add_responsive_control(
			'ekit_adv_dropdown_margin',
			[
				'label' => esc_html__('Margin', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);
		$this->add_control(
			'ekit_adv_dropdown_item_heading',
			[
				'type' => Controls_Manager::HEADING,
				'label' => esc_html__('Dropdown Item', 'elementskit'),
				'separator' => 'before',
			]
		);
		$this->add_control(
			'ekit_adv_dropdown_item_hover_color',
			[
				'label' => esc_html__('Hover Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown .select-option:hover' => 'color: {{VALUE}}',
				],
			]
		);
		$this->add_control(
			'ekit_adv_dropdown_item_hover_bg',
			[
				'label' => esc_html__('Hover Background', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown .select-option:hover' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_dropdown_item_padding',
			[
				'label' => esc_html__('Padding', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li .select .select-dropdown .select-option' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_button_style',
			[
				'label' => esc_html__('Button', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [
					'ekit_adv_show_button' => 'yes',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_search_button_typography',
				'selector' => '{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button',
			]
		);

		$this->start_controls_tabs(
			'ekit_adv_search_button_tabs'
		);

		$this->start_controls_tab(
			'ekit_adv_search_button_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_button_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#ffff',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button' => 'color: {{VALUE}}',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit > :is(i, svg)' => 'color: {{VALUE}}; fill: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_button_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '#4827ec',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_button_box_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button',
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'ekit_adv_submit_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_button_hover_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#ffff',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button:hover' => 'color: {{VALUE}}',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit > :is(i, svg):hover' => 'color: {{VALUE}}; fill: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_button_hover_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '#4827ec',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button:hover' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_button_hover_box_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button:hover',
			]
		);
		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'ekit_adv_search_button_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_button_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_button_space',
			[
				'label' => esc_html__('Space Between', 'elementskit'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', 'em', '%'],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-option li.ekit-submit .ekit-search-button' => 'gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_result_wrapper_style',
			[
				'label' => esc_html__('Result Wrapper', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'ekit_adv_search_result_wrapper_background',
				'types' => ['classic', 'gradient'],
				'exclude' => ['image'],
				'fields_options' => [
					'color' => [
						'label' => esc_html__('Background Color', 'elementskit'),
					],
				],
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result',
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'ekit_adv_search_result_wrapper_box_shadow',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result',
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_result_wrapper_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result',
			]
		);

		$this->add_control(
			'ekit_adv_search_result_wrapper_border_radius',
			[
				'label' => esc_html__('Border Radius', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'default'    => [
					'top' => '3',
					'right' => '3',
					'bottom' => '3',
					'left' => '3',
					'unit' => 'px',
					'isLinked' => ''
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_result_wrapper_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'default'    => [
					'top' => '20',
					'right' => '20',
					'bottom' => '20',
					'left' => '20',
					'unit' => 'px',
					'isLinked' => ''
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result:not(.after-popular-keyword) .ekit-popular-keyword' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-footer' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_keyword_style',
			[
				'label' => esc_html__('Keywords', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [
					'ekit_adv_show_popular_keyword' => 'yes',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_keyword_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword',
			]
		);

		$this->add_responsive_control(
			'ekit_adv_keyword_between_space',
			[
				'label' => esc_html__('Space', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'size_units' => ['px', '%', 'em', 'rem'],
				'default' => [
					'top' => '2.5',
					'right' => '2.5',
					'bottom' => '2.5',
					'left' => '2.5',
					'unit' => 'px',
					'isLinked' => ''
				],
				'placeholder' =>  [
					'top' => '2.5',
					'right' => '2.5',
					'bottom' => '2.5',
					'left' => '2.5',
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_keyword_padding_button',
			[
				'label'      => esc_html__('Padding Button', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'default' => [
					'top' => '6',
					'right' => '25',
					'bottom' => '6',
					'left' => '25',
					'unit' => 'px',
					'isLinked' => ''
				],
				'placeholder' =>  [
					'top' => '6',
					'right' => '25',
					'bottom' => '6',
					'left' => '25',
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);


		$this->start_controls_tabs(
			'ekit_adv_keyword_tabs'
		);

		$this->start_controls_tab(
			'ekit_adv_keyword_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_keyword_text_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#434872',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_keyword_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '#bfd0f5',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_keyword_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword',
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'ekit_adv_keyword_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_keyword_hover_text_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#434872',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword:hover' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_keyword_hover_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '#bfd0f5',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword:hover' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_keyword_hover_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword:hover',
			]
		);

		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'ekit_adv_keyword_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_keyword_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'default'    => [
					'top' => '20',
					'right' => '20',
					'bottom' => '20',
					'left' => '20',
					'unit' => 'px',
					'isLinked' => ''
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result:is(.after-popular-keyword) .ekit-popular-keyword' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'ekit_adv_keyword_heading',
			[
				'label' => esc_html__('Keywords Title', 'elementskit'),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_keyword_title_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword-title',
			]
		);

		$this->add_control(
			'ekit_adv_keyword_title_text_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#8588a6',
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-popular-keyword .ekit-keyword-title' => 'color: {{VALUE}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_search_result_style',
			[
				'label' => esc_html__('Search Result', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_result_margin',
			[
				'label'      => esc_html__('Margin', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'default' => [
					'top' => '8',
					'right' => '0',
					'bottom' => '8',
					'left' => '0',
					'unit' => 'px',
					'isLinked' => ''
				],
				'placeholder' =>  [
					'top' => '8',
					'right' => '0',
					'bottom' => '8',
					'left' => '0',
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_result_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'default' => [
					'top' => '6',
					'right' => '6',
					'bottom' => '6',
					'left' => '6',
					'unit' => 'px',
					'isLinked' => ''
				],

				'placeholder' =>  [
					'top' => '6',
					'right' => '6',
					'bottom' => '6',
					'left' => '6',
				],
				'selectors'  => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_search_result_border',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item',
			]
		);

		$this->add_control(
			'ekit_adv_search_result_background_color',
			[
				'label' => esc_html__('Background Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item' => 'background-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_count_heading',
			[
				'label' => esc_html__('Result Count', 'elementskit'),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_search_result_count_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-search-total',
			]
		);

		$this->add_control(
			'ekit_adv_search_result_count_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-search-total' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_count_margin',
			[
				'label' => esc_html__('Margin', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-search-total' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_thumbnail_heading',
			[
				'label' => esc_html__('Thumbnail', 'elementskit'),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'ekit_adv_search_result_thumbnail_width',
			[
				'label' => esc_html__('Width', 'elementskit'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', '%', 'em'],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 500,
						'step' => 1,
					],
					'%' => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 120,
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item a .ekit-result-thumb' => 'width: {{SIZE}}{{UNIT}}; flex: 0 0 {{SIZE}}{{UNIT}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_thumbnail_height',
			[
				'label' => esc_html__('Height', 'elementskit'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', '%', 'em'],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 500,
						'step' => 1,
					],
					'%' => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 70,
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item a .ekit-result-thumb' => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_thumbnail_between_space',
			[
				'label' => esc_html__('Between Space', 'elementskit'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', '%', 'em', 'rem'],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
					'%' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 15,
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item a .ekit-result-thumb' => 'margin-right: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_thumbnail_radius',
			[
				'label' => esc_html__('Border Radius', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item a .ekit-result-thumb' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_title_heading',
			[
				'label' => esc_html__('Title', 'elementskit'),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_search_result_title_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item .ekit-result-title',
			]
		);
		$this->start_controls_tabs(
			'ekit_adv_search_result_style_tabs'
		);

		$this->start_controls_tab(
			'ekit_adv_search_result_style_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_result_text_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item .ekit-result-title' => 'color: {{VALUE}}',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'ekit_adv_search_result_style_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_search_result_hover_text_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item:hover .ekit-result-title' => 'color: {{VALUE}}',
				],
			]
		);


		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_control(
			'ekit_adv_search_result_title_margin',
			[
				'label' => esc_html__('Margin', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item .ekit-result-title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_description_heading',
			[
				'label' => esc_html__('Description', 'elementskit'),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_search_result_description_typography',
				'selector' => '{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item .ekit-result-excerpt',
			]
		);

		$this->add_control(
			'ekit_adv_search_result_desc_color',
			[
				'label' => esc_html__('Text Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item .ekit-result-excerpt' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_desc_margin',
			[
				'label' => esc_html__('Margin', 'elementskit'),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item .ekit-result-excerpt' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_search_result_icon_heading',
			[
				'label' => esc_html__('Icon', 'elementskit'),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'ekit_adv_search_result_icon_color',
			[
				'label' => esc_html__('Icon Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item i' => 'color: {{VALUE}}',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item svg' => 'fill: {{VALUE}}',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_adv_search_result_icon_size',
			[
				'label' => esc_html__('Icon Size', 'elementskit'),
				'type' => Controls_Manager::SLIDER,
				'size_units' => ['px', 'em'],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
					],
					'em' => [
						'min' => 0,
						'max' => 10,
						'step' => 0.1,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item i' => 'font-size: {{SIZE}}{{UNIT}}',
					'{{WRAPPER}} .ekit-advanced-search-wrapper .ekit-advanced-search-result .ekit-search-result-items .ekit-result-item svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}}',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_adv_section_search_result_load_more',
			[
				'label' => esc_html__('Load More Button', 'elementskit'),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [
					'ekit_serach_load_more' => 'yes',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_adv_load_more_button_typography',
				'selector' => '{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button',
			]
		);
		$this->start_controls_tabs(
			'ekit_adv_load_more_button_tabs'
		);

		$this->start_controls_tab(
			'ekit_adv_load_more_button_normal_tab',
			[
				'label' => esc_html__('Normal', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_load_more_button_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#ffff',
				'selectors' => [
					'{{WRAPPER}} {{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_load_more_button_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '#4827ec',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_load_more_button_shadow',
				'selector' => '{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button',
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'ekit_adv_load_more_button_hover_tab',
			[
				'label' => esc_html__('Hover', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_adv_load_more_button_hover_color',
			[
				'label' => esc_html__('Color', 'elementskit'),
				'type' => Controls_Manager::COLOR,
				'default' => '#ffff',
				'selectors' => [
					'{{WRAPPER}} {{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button:hover' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_adv_load_more_button_hover_bg',
			[
				'label'     => esc_html__('Background Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'default' => '#4827ec',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button:hover' => 'background: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_adv_load_more_button_hover_box_shadow',
				'selector' => '{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button:hover',
			]
		);
		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'ekit_adv_load_more_button_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', 'em', '%'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'ekit_adv_load_more_button_padding',
			[
				'label'      => esc_html__('Padding', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%', 'em', 'rem'],
				'selectors'  => [
					'{{WRAPPER}} .ekit-wid-con .ekit-advanced-search-wrapper .ekit-search-load-more-button .ekit-button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);
		$this->end_controls_section();
	}

	protected function get_the_post_type()
	{
		$dropdown_options = [
			'none' => esc_html__('None', 'elementskit'),
		];
		$excluded_post = [
			// 'elementskit_content',
			// 'elementskit_widget',
			// 'attachment',
		];
		$post_types = get_post_types(array('public' => true), 'objects');
		foreach ($post_types as $post_key => $post_type) {
			// Exclude the larger breakpoints from the dropdown selector.
			if (in_array($post_key, $excluded_post, true)) {
				continue;
			}

			$dropdown_options[$post_type->name] = sprintf(
				esc_html__('%1$s', 'elementskit'),
				$post_type->labels->name
			);
		}
		return $dropdown_options;
	}

	protected function get_the_category_type()
	{
		$category_options = [];
		$excluded_post = [
			// 'elementskit_content',
			// 'elementskit_widget',
			// 'attachment',
		];

		$post_types = get_post_types(array('public' => true), 'objects');
		foreach ($post_types as $post_key => $post_type) {
			// Exclude the larger breakpoints from the dropdown selector.
			if (in_array($post_key, $excluded_post, true)) {
				continue;
			}
			// Get taxonomies associated with the current post type
			$taxonomies = get_object_taxonomies($post_type->name);

			// Initialize an empty array to store categories for the current post type
			$categories = [];

			// Loop through each taxonomy associated with the current post type
			foreach ($taxonomies as $taxonomy) {
				// Check if the taxonomy name contains "category"
				if (preg_match('/category|categories|cat|cats/', $taxonomy)) {
					$args = array(
						'orderby'    => 'name',
						'order'      => 'ASC',
						'hide_empty' => true,
					);

					// Get categories for the current taxonomy and post type
					$categories = array_merge($categories, get_terms($taxonomy, $args));
				}
			}
			// Store category names in the $category_names array
			foreach ($categories as $category) {
				$category_options[$category->term_id] = sprintf(
					esc_html__('%1$s', 'elementskit'),
					$category->name
				);
			}
		}
		return $category_options;
	}

	protected function render()
	{
		echo '<div class="ekit-wid-con" >';
		$this->render_raw();
		echo '</div>';
	}

	protected function render_raw()
	{
		$settings = $this->get_settings_for_display();
		extract($settings);
		$args = [
			'postType' => isset($ekit_adv_search_post_type) ? $ekit_adv_search_post_type : [],
			'postsPerPage' => !empty($ekit_adv_search_per_page) ? (int) $ekit_adv_search_per_page : 5,
			'order' => 'DESC',
			'keywordOff' => !empty($ekit_adv_show_popular_keyword) ?? true,
			'enableBlur' => !empty($ekit_adv_search_body_enable_blur) ?? true,
			'keywordsRank' => !empty($ekit_adv_search_most_popular_keyword_rank) ? (int) $ekit_adv_search_most_popular_keyword_rank : 5,
			'keywordsLimit' => !empty($ekit_adv_search_popular_keywords_display) ? (int) $ekit_adv_search_popular_keywords_display : 5,
			'searchIcon' => Icons_Manager::try_get_icon_html($ekit_adv_search_icon, ['aria-hidden' => 'true']),
			'showThumbnail' => $ekit_adv_show_thumbnail,
			'showContent' => $ekit_adv_show_content,
			'styleSelect' => $ekit_adv_search_style,
			'excludeCategory' => isset($ekit_adv_exclude_category) ? $ekit_adv_exclude_category : [],
			'includeCategory' => isset($ekit_adv_include_category) ? $ekit_adv_include_category : [],
			'resultLabel' => !empty($ekit_adv_search_total_label) ? $ekit_adv_search_total_label : esc_html__('Results found for:', 'elementskit'),
		];

		/*
		*
		* Roots.io searchform.php template hack to fix Polylang search
		* https://gist.github.com/bramchi/d0767c32a772550486ea
		* Note: Polylang setting 'Hide URL language info for default language' should be enabled for this to work.
		* Soil-nice-search disabled in Roots.
		*
		*/
		$language_prefix = (!function_exists('pll_current_language') ? '' : pll_current_language());

		$this->add_render_attribute(
			'ekit_adv_search_form',
			[
				'data-settings' => wp_json_encode($args),
				'method'        => 'POST',
				'action'		=> esc_url(get_rest_url(null, 'elementskit/v1/advanced-search/' . $language_prefix)),
				'name'          => 'ekit-adv-search-form-' . $this->get_id(),
				'role'			=> 'search',
				'id'			=> 'search-form-' . $this->get_id(),
			]
		);
?>
		<div class="ekit-advanced-search-wrapper">
			<?php $this->get_search_form($settings); ?>
			<?php $this->get_advanced_search_result($settings); ?>
		</div>
	<?php

	}
	// ekit advanced search form config
	protected function get_list_by_categories($settings, $post_type = [], $apply_filters = true)
	{
		// Initialize the $query_args array key
		$query_args = [
			'post_type' =>  $post_type,
			'orderby' => 'title',
			'order'   => 'ASC',
			'hide_empty' => true,
		];

		// Initialize the $list_taxonomy variable
		$list_taxonomy = [];

		if (! empty($post_type) && is_array($post_type)) {
			// Get taxonomies associated with the post type
			$taxonomies = get_object_taxonomies($post_type, 'names');

			// If there are no taxonomies, return an empty list
			if (empty($taxonomies)) {
				return $list_taxonomy;
			}
			// Set the 'taxonomy' argument with the taxonomies associated with the post type
			$query_args['taxonomy'] = $taxonomies;
		}

		// Apply exclusion and inclusion filters if needed
		if ($apply_filters) {
			// Set 'exclude' and 'include' arguments based on the settings
			if (isset($settings['ekit_adv_exclude_category']) && ! empty($settings['ekit_adv_exclude_category'])) {
				$query_args['exclude'] = array_map('intval', $settings['ekit_adv_exclude_category']);
			}

			if (isset($settings['ekit_adv_include_category']) && ! empty($settings['ekit_adv_include_category'])) {
				$query_args['include'] = array_map('intval', $settings['ekit_adv_include_category']);
			}
		}

		$terms = get_terms($query_args);
		if (!empty($terms) && !is_wp_error($terms)) {
			// Loop through each taxonomy associated with the post type
			foreach ($terms as $taxonomy) {
				if (preg_match('/category|categories|cat|cats/', $taxonomy->taxonomy)) {
					// Categories (e.g., category, product_category, event_category)
					$list_taxonomy[] = $taxonomy;
				}
			}
			return $list_taxonomy;
		}
	}

	protected function get_list_by_tags($post_type = [])
	{
		// Initialize the $query_args array key
		$tag_args = [
			'post_type' =>  $post_type,
			'orderby' => 'title',
			'order'   => 'ASC',
			'hide_empty' => true,
		];

		// Initialize the $list_taxonomy variable
		$list_tags = [];

		if (! empty($post_type) && is_array($post_type)) {
			// Get taxonomies associated with the post type
			$taxonomy_tags = get_object_taxonomies($post_type, 'names');

			// If there are no taxonomies, return an empty list
			if (empty($taxonomy_tags)) {
				return $list_tags;
			}
			// Set the 'taxonomy' argument with the taxonomies associated with the post type
			$tag_args['taxonomy'] = $taxonomy_tags;
		}

		$terms = get_terms($tag_args);
		if (!empty($terms) && !is_wp_error($terms)) {
			// Loop through each taxonomy associated with the post type
			foreach ($terms as $term) {
				if (preg_match('/tag|tags/', $term->taxonomy)) {
					// Tags (e.g., tag, product_tag, event_tag)
					$list_tags[] = $term;
				}
			}
			return $list_tags;
		}
	}

	protected function get_the_categories($settings)
	{
		extract($settings);
	?>
		<div class="select" id="select" tabindex="0">
			<div class="select-trigger" tabindex="0">
				<span class="selected-text"><?php echo esc_html($ekit_adv_section_search_categories); ?></span>
				<span class="arrow">
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">
						<path d="M1 1L6 6L11 1" stroke="#17171E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</span>
			</div>
			<div class="select-dropdown">
				<?php
				$exclude_include = !empty($ekit_adv_use_exclude_include) ? true : false;
				$cats = $this->get_list_by_categories($settings, $ekit_adv_search_post_type, $exclude_include);
				if (!empty($cats)): ?>
					<?php foreach ($cats as $index => $cat): ?>
						<?php if ($index == 0) : ?>
							<div class="select-option" data-value="0"> <?php echo esc_html($ekit_adv_section_search_categories); ?> </div>
						<?php endif; ?>
						<div class="select-option" data-value="<?php echo esc_attr($cat->term_id); ?>">
							<?php echo esc_html__($cat->name, 'elementskit'); ?>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>

			<!-- Hidden input to capture selected value -->
			<input type="hidden" name="post_category" id="selected-value" value="0">
		</div>
	<?php
	}

	protected function get_the_tags($settings)
	{
		extract($settings);
	?>
		<div class="select" id="select" tabindex="0">
			<div class="select-trigger" tabindex="0">
				<span class="selected-text"><?php echo esc_html($ekit_adv_section_search_tags); ?></span>
				<span class="arrow">
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">
						<path d="M1 1L6 6L11 1" stroke="#17171E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</span>
			</div>
			<div class="select-dropdown">
				<?php
				$tags = $this->get_list_by_tags($ekit_adv_search_post_type);
				if (!empty($tags)): ?>
					<?php foreach ($tags as $index => $tag): ?>
						<?php if ($index == 0) : ?>
							<div class="select-option" data-value="0"> <?php echo esc_html($ekit_adv_section_search_tags); ?> </div>
						<?php endif; ?>
						<div class="select-option" data-value="<?php echo esc_attr($tag->term_id); ?>">
							<?php echo esc_html__($tag->name, 'elementskit'); ?>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>

			<!-- Hidden input to capture selected value -->
			<input type="hidden" name="post_tag" id="selected-value" value="0">
		</div>
	<?php
	}

	protected function get_search_form($settings)
	{
		extract($settings); ?>
		<form <?php $this->print_render_attribute_string('ekit_adv_search_form'); ?>>
			<ul class="ekit-advanced-search-option">
				<li class="ekit-search">

					<?php if ($ekit_adv_search_placeholder_show_icon === 'yes') : ?>
						<span class="ekit-adv-search-plhdr-icon">
							<?php Icons_Manager::render_icon($ekit_adv_search_placeholder_icon, ['aria-hidden' => 'true']); ?>
						</span>
					<?php endif; ?>

					<input class="search-field" type="text" name="s" id="search" value="<?php the_search_query(); ?>" placeholder="<?php echo esc_attr__($ekit_adv_section_search_placeholder, 'elementskit'); ?>">
					<div class="ekit-adv-search-loader-closer">
						<span class="ekit-adv-search-loader"></span>
						<span class="ekit-adv-search-closer">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
								<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
							</svg>
						</span>
					</div>
				</li>
				<?php if ($ekit_adv_show_category === 'yes') : ?>
					<li class="ekit-category">
						<?php $this->get_the_categories($settings); ?>
					</li>
				<?php endif;
				if ($ekit_adv_show_tag === 'yes') : ?>
					<li class="ekit-tag">
						<?php $this->get_the_tags($settings); ?>
					</li>
				<?php endif;

				if ($ekit_adv_show_button === 'yes') : ?>
					<li class="ekit-submit">
						<button class="ekit-search-button" type="submit">
							<?php if ($ekit_adv_search_button_icon_show_icon === 'yes') :
								Icons_Manager::render_icon($ekit_adv_search_button_icon, [
									'aria-hidden' => 'true',
									'class' => 'ekit-search-icon'
								]);
								Icons_Manager::render_icon($ekit_adv_search_button_close_icon, [
									'aria-hidden' => 'true',
									'class' => 'ekit-close-icon'
								]);
							endif; ?>
							<span class="ekit-search-button-text"><?php echo esc_html($ekit_adv_section_search_button) ?> </span>
						</button>
					</li>
				<?php endif; ?>
			</ul>
		</form>
		<?php
	}

	// ekit advanced search result config
	protected function get_popular_keyword($settings)
	{
		extract($settings);
		if ($ekit_adv_show_popular_keyword == 'yes') {
			$popular_keywords =  (array) get_option('ekit_advanced_search_popular_keyword', true);
			if (empty($popular_keywords) || count($popular_keywords) < 2) {
				return;
			}

			arsort($popular_keywords);
			$popular_keywords_html = '';
			$rank                  = $ekit_adv_search_most_popular_keyword_rank;
			$limit                 = $ekit_adv_search_popular_keywords_display;
			foreach (array_slice($popular_keywords, 1, $limit) as $key => $item) {
				if ($item <= $rank) {
					continue;
				}
				$keyword        = ucfirst(str_replace('_', ' ', $key));
				$data_id        = uniqid();
				$keyword_html   = sprintf('<a href="javascript:void(0)" class="ekit-keyword" id="%2$s" data-id="%2$s" data-keyword="%1$s">%1$s</a>', $keyword, $data_id);
				$popular_keywords_html .= $keyword_html;
			}
			if (! empty($popular_keywords_html)) : ?>
				<span class="ekit-keyword-title"><?php echo esc_html($ekit_adv_show_popular_keyword_title); ?></span>
				<div class="ekit-popular-keyword-items ekit-keyword-list"> <?php echo $popular_keywords_html; ?> </div>
		<?php endif;
		}
	}
	protected function get_result_footer($settings)
	{
		extract($settings);
		?>
		<div class="ekit-search-load-more-button">
			<?php if ($ekit_serach_load_more === 'yes'):; ?>
				<a class="ekit-button" href="javascript:void(0)"><?php echo esc_html__($ekit_search_load_more_button, 'elementskit'); ?></a>
			<?php endif; ?>
		</div>
		<div class="ekit-advanced-search-owner">
			<?php if ($ekit_search_by_copyright == 'yes'):;
				if (! empty($ekit_search_in_copyright_url['url'])) {
					$this->add_link_attributes('uri', $ekit_search_in_copyright_url);
				}
			?>
				<a <?php echo $this->get_render_attribute_string('uri'); ?>>
					<span class="ekit-search-by"><?php echo esc_html__('Search by', 'elementskit'); ?> </span>
					<span class="ekit-search-in"><?php echo esc_html(ucfirst($ekit_search_in_copyright_name)); ?></span>
				</a>
			<?php endif; ?>
		</div>
		<?php
	}
	protected function get_advanced_search_result($settings)
	{
		extract($settings);
		if ($ekit_adv_show_popular_keyword == 'yes') :; ?>
			<div class="ekit-advanced-search-result after-popular-keyword">
				<div class="ekit-popular-keyword">
					<?php $this->get_popular_keyword($settings); ?>
				</div>
			</div>
		<?php endif; ?>
		<div class="ekit-advanced-search-result">
			<?php if ($ekit_adv_show_popular_keyword == 'yes') :; ?>
				<div class="ekit-popular-keyword">
					<?php $this->get_popular_keyword($settings); ?>
				</div>
			<?php endif; ?>
			<div class="ekit-search-result-items"> </div>
			<?php if ($settings['ekit_serach_footer'] === 'yes'):; ?>
				<div class="ekit-search-result-footer">
					<?php $this->get_result_footer($settings); ?>
				</div>
			<?php endif; ?>
		</div>
<?php
	}
}
