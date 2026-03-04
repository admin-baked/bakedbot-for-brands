<?php
namespace Elementor;

use \Elementor\ElementsKit_Widget_Circle_Menu_Handler as Handler;

if ( ! defined( 'ABSPATH' ) ) exit;

class Elementskit_Widget_Circle_Menu extends Widget_Base {

	use \Elementskit_Lite\Widgets\Widget_Notice;

	public $base;

	public function __construct( $data = [], $args = null ) {
		parent::__construct( $data, $args );
		$this->add_script_depends('circle-menu');
	}

	public function get_name() {
		return Handler::get_name();
	}

	public function get_title() {
		return Handler::get_title();
	}

	public function get_icon() {
		return Handler::get_icon();
	}

	public function get_categories() {
		return Handler::get_categories();
	}

	public function get_keywords() {
		return ['ekit', 'menu', 'circle', 'floating', 'hover'];
	}

	public function get_help_url() {
		return 'https://wpmet.com/doc/circle-menu/';
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	protected function register_controls() {

		$this->start_controls_section(
			'ekit_cm_content_section',
			[
				'label' => esc_html__('Content', 'elementskit'),
			]
		);

		$repeater_body = new Repeater();

		$repeater_body->add_control(
			'ekit_cm_icon',
			[
				'label' => esc_html__( 'Icon', 'elementskit' ),
				'type' => Controls_Manager::ICONS,
				'default' => [
					'value' => 'icon icon-home',
					'library' => 'ekiticons',
				],
			]
		);

		$repeater_body->add_control(
			'ekit_cm_title',
			[
				'label' => esc_html__( 'Title', 'elementskit' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Home', 'elementskit' ),
				'placeholder' => esc_html__( 'Type your title here', 'elementskit' ),
			]
		);

		$repeater_body->add_control(
			'ekit_cm_tooltip',
			[
				'label' => esc_html__( 'Tooltip', 'elementskit' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Home', 'elementskit' ),
				'placeholder' => esc_html__( 'Type your tooltip here', 'elementskit' ),
			]
		);

		$repeater_body->add_control(
			'ekit_cm_website_link',
			[
				'label' => esc_html__( 'Link', 'elementskit' ),
				'type' => Controls_Manager::URL,
				'options' => [ 'url', 'is_external', 'nofollow' ],
				'default' => [
					'url' => '#',
					'is_external' => true,
					'nofollow' => true,
					// 'custom_attributes' => '',
				],
				'label_block' => true,
			]
		);

		$this->add_control(
			'ekit_cm_content',
			[
				'type'     => Controls_Manager::REPEATER,
				'fields'      => $repeater_body->get_controls(),
				'default' => [
					[
						'ekit_cm_title' => esc_html__('Home', 'elementskit'),
						'ekit_cm_tooltip' => esc_html__('Home', 'elementskit'),
						'ekit_cm_icon' => [
							'value' => 'icon icon-home',
							'library' => 'ekiticons',
						],
					],
					[
						'ekit_cm_title' => esc_html__('About', 'elementskit'),
						'ekit_cm_tooltip' => esc_html__('About', 'elementskit'),
						'ekit_cm_icon' => [
							'value' => 'icon icon-agenda',
							'library' => 'ekiticons',
						],
					],
					[
						'ekit_cm_title' => esc_html__('Servies', 'elementskit'),
						'ekit_cm_tooltip' => esc_html__('Servies', 'elementskit'),
						'ekit_cm_icon' => [
							'value' => 'icon icon-service',
							'library' => 'ekiticons',
						],
					],
					[
						'ekit_cm_title' => esc_html__('Faq', 'elementskit'),
						'ekit_cm_tooltip' => esc_html__('Faq', 'elementskit'),
						'ekit_cm_icon' => [
							'value' => 'icon icon-faq',
							'library' => 'ekiticons',
						],
					],
					[
						'ekit_cm_title' => esc_html__('Contact', 'elementskit'),
						'ekit_cm_tooltip' => esc_html__('Contact', 'elementskit'),
						'ekit_cm_icon' => [
							'value' => 'icon icon-contact-form',
							'library' => 'ekiticons',
						],
					],
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_cm_content_section_settings',
			[
				'label' => esc_html__('Settings', 'elementskit'),
			]
		);

		$this->add_control(
			'ekit_cm_item_direction',
			[
				'label'   => esc_html__('Menu Direction', 'elementskit'),
				'type'    => Controls_Manager::SELECT,
				'default' => 'bottom-right',
				'options' => [
					'top'          => esc_html__('Top', 'elementskit'),
					'right'        => esc_html__('Right', 'elementskit'),
					'bottom'       => esc_html__('Bottom', 'elementskit'),
					'left'         => esc_html__('Left', 'elementskit'),
					'top'          => esc_html__('Top', 'elementskit'),
					'full'         => esc_html__('Full', 'elementskit'),
					'top-left'     => esc_html__('Top-Left', 'elementskit'),
					'top-right'    => esc_html__('Top-Right', 'elementskit'),
					'top-half'     => esc_html__('Top-Half', 'elementskit'),
					'bottom-left'  => esc_html__('Bottom-Left', 'elementskit'),
					'bottom-right' => esc_html__('Bottom-Right', 'elementskit'),
					'bottom-half'  => esc_html__('Bottom-Half', 'elementskit'),
					'left-half'    => esc_html__('Left-Half', 'elementskit'),
					'right-half'   => esc_html__('Right-Half', 'elementskit'),
				],
			]
		);

		$wrapper_selector = Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' ) ? '{{WRAPPER}}' : '{{WRAPPER}} .elementor-widget-container';
		
		$this->add_control(
			'ekit_cm_item_diameter',
			[
				'label'   => esc_html__('Circle Menu Size', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'render_type' => 'template',
				'default' => [
					'size' => 60,
				],
				'range' => [
					'px' => [
						'min'  => 20,
						'step' => 1,
						'max'  => 500,
					],
				],
				'selectors' => [
					$wrapper_selector => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_radius',
			[
				'label'   => esc_html__('Circle Menu Distance', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'default' => [
					'size' => 150,
				],
				'range' => [
					'px' => [
						'min'  => 20,
						'step' => 5,
						'max'  => 500,
					],
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_speed',
			[
				'label'   => esc_html__('Speed', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'default' => [
					'size' => 600,
				],
				'range' => [
					'px' => [
						'min'  => 100,
						'step' => 10,
						'max'  => 1000,
					],
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_delay',
			[
				'label'   => esc_html__('Delay', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'default' => [
					'size' => 1500,
				],
				'range' => [
					'px' => [
						'min'  => 100,
						'step' => 10,
						'max'  => 2000,
					],
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_step_out',
			[
				'label'   => esc_html__('Step Out', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'default' => [
					'size' => -80,
				],
				'range' => [
					'px' => [
						'min'  => -200,
						'step' => 5,
						'max'  => 200,
					],
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_step_in',
			[
				'label'   => esc_html__('Step In', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'default' => [
					'size' => -105,
				],
				'range' => [
					'px' => [
						'min'  => -200,
						'step' => 5,
						'max'  => 200,
					],
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_trigger',
			[
				'label'   => esc_html__('Trigger', 'elementskit'),
				'type'    => Controls_Manager::SELECT,
				'default' => 'hover',
				'options' => [
					'hover' => esc_html__('Hover', 'elementskit'),
					'click' => esc_html__('Click', 'elementskit'),
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_transition',
			[
				'label'   => esc_html__('Transition', 'elementskit'),
				'type'    => Controls_Manager::SELECT,
				'default' => 'ease',
				'options' => [
					'ease'        => esc_html__('Ease', 'elementskit'),
					'linear'      => esc_html__('Linear', 'elementskit'),
					'ease-in'     => esc_html__('Ease-In', 'elementskit'),
					'ease-out'    => esc_html__('Ease-Out', 'elementskit'),
					'ease-in-out' => esc_html__('Ease-In-Out', 'elementskit'),
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_cm_wrapper_style_section', [
				'label'	 => esc_html__( 'Wrapper', 'elementskit' ),
				'tab'	 => Controls_Manager::TAB_STYLE,
			]
		);

		$this->start_controls_tabs(
            'ekit_cm_wrapper_tabs'
        );

        $this->start_controls_tab(
            'ekit_cm_wrapper_normal_tab',
            [
                'label' => esc_html__( 'Normal', 'elementskit' ),
            ]
        );

        $this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'ekit_cm_wrapper_bg',
				'types' => [ 'classic', 'gradient', ],
				'selector' => '{{WRAPPER}} .ekit-circle-menu-box li',
			]
		);

        $this->add_group_control(
            Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'ekit_cm_wrapper_shadow',
                'selector' => '{{WRAPPER}} .ekit-circle-menu-box li',
            ]
        );

        $this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_cm_wrapper_border',
				'selector' => '{{WRAPPER}} .ekit-circle-menu-box li',
			]
		);

		$this->add_responsive_control(
			'ekit_cm_wrapper_border_radius',
			[
				'label' => esc_html__( 'Border Radius', 'elementskit' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em' ],
				'default' => [
					'top'      => '5',
					'right'    => '5',
					'bottom'   => '5',
					'left'     => '5',
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-circle-menu-wrapper .ekit-circle-menu-box li' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
				],
			]
		);

        $this->end_controls_tab();

        $this->start_controls_tab(
            'ekit_cm_wrapper_hv_tab',
            [
                'label' => esc_html__( 'Hover', 'elementskit' ),
            ]
        );

        $this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'ekit_cm_wrapper_hv_bg',
				'types' => [ 'classic', 'gradient', ],
				'selector' => '{{WRAPPER}} .ekit-circle-menu-box li:hover',
			]
		);

        $this->add_group_control(
            Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'ekit_cm_wrapper_hv_shadow',
                'selector' => '{{WRAPPER}} .ekit-circle-menu-box li:hover',
            ]
        );

        $this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'ekit_cm_wrapper_hv_border',
				'selector' => '{{WRAPPER}} .ekit-circle-menu-box li:hover',
			]
		);

		$this->add_responsive_control(
			'ekit_cm_wrapper_hv_border_radius',
			[
				'label' => esc_html__( 'Border Radius', 'elementskit' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em' ],
				'default' => [
					'top'      => '5',
					'right'    => '5',
					'bottom'   => '5',
					'left'     => '5',
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-circle-menu-wrapper .ekit-circle-menu-box li:hover' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
				],
			]
		);

        $this->end_controls_tab();

        $this->end_controls_tabs();

		$this->add_control(
			'ekit_cm_item_content_transform',
			[
				'label'   => esc_html__('Content Transform', 'elementskit'),
				'type'    => Controls_Manager::SLIDER,
				'separator' => 'before',
				'default' => [
					'unit' => 'px',
					'size' => -6,
				],
				'range' => [
					'px' => [
						'min'  => -100,
						'max'  => 100,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-box li a' => 'top: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'ekit_cm_item_style_section',
			[
				'label' => esc_html__('Content', 'elementskit'),
				'tab'	 => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'ekit_cm_item_icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 5,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 12,
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item :is(i, svg)' => 'font-size: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_icon_color',
			[
				'label' => esc_html__( 'Color', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item :is(i, svg)' => 'color: {{VALUE}}; fill: {{VALUE}};',
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item > svg > path ' => 'stroke: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_icon_hv_color',
			[
				'label' => esc_html__( 'Hover Color', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-box li:hover .ekit-circle-menu-item :is(i, svg)' => 'color: {{VALUE}}; fill: {{VALUE}};',
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-box li:hover .ekit-circle-menu-item > svg > path ' => 'stroke: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'ekit_cm_item_close_icon_margin',
			[
				'label' => esc_html__( 'Margin', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-wrapper :is(i, svg)' => 'margin-bottom: {{SIZE}}{{UNIT}};',
				],
				'separator' => "after"
			]
		);

		$this->add_control(
			'ekit_cm_item_close_icon_size',
			[
				'label' => esc_html__( 'Close Icon Size', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'separator' => 'before',
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 5,
					],
				],
				'default' => [
					'unit' => 'px',
					'size' => 12,
				],
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-close :is(i, svg)' => 'font-size: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_title_style',
			[
				'label' => esc_html__( 'Title', 'elementskit' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_cm_item_title_typography',
				'fields_options' => [
					'typography' => ['default' => 'yes'],
					'font_size'    => [
						'default'  => [
							'size' => '12',
							'unit' => 'px'
						],
						'label'    => 'Font size',
					],
					'line_height'    => [
						'default'  => [
							'size' => '15',
							'unit' => 'px'
						],
						'label'    => 'Line height',
					],
				],
				'selector' => '{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item',
			]
		);

		$this->add_control(
			'ekit_cm_item_title_color',
			[
				'label' => esc_html__( 'Color', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#fff',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_title_hv_color',
			[
				'label' => esc_html__( 'Hover Color', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#fff',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-box li:hover .ekit-circle-menu-item' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_tooltip_style',
			[
				'label' => esc_html__( 'Tooltip', 'elementskit' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'ekit_cm_item_tooltip_typography',
				'fields_options' => [
					'typography' => ['default' => 'yes'],
					'font_size'    => [
						'default'  => [
							'size' => '12',
							'unit' => 'px'
						],
						'label'    => 'Font size',
					],
					'line_height'    => [
						'default'  => [
							'size' => '15',
							'unit' => 'px'
						],
						'label'    => 'Line height',
					],
				],
				'selector' => '{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-item-tooltip',
			]
		);

		$this->add_control(
			'ekit_cm_item_tooltip_color',
			[
				'label' => esc_html__( 'Color', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#fff',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-item-tooltip' => 'color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_tooltip_bg',
			[
				'label' => esc_html__( 'Background', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#000',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-item-tooltip' => 'background-color: {{VALUE}}',
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-box li a .ekit-circle-menu-item-tooltip::before' => 'border-right-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_tooltip_hv_bg',
			[
				'label' => esc_html__( 'Hover Background', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#666',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-item-tooltip:hover' => 'background-color: {{VALUE}}',
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-box li a .ekit-circle-menu-item-tooltip:hover::before' => 'border-right-color: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'ekit_cm_item_tooltip_hv_color',
			[
				'label' => esc_html__( 'Hover Color', 'elementskit' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#fff',
				'selectors' => [
					'{{WRAPPER}} .ekit-wid-con .ekit-circle-menu-item .ekit-circle-menu-item-tooltip:hover' => 'color: {{VALUE}}',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		echo '<div class="ekit-wid-con">';
			$this-> render_raw();
		echo '</div>';
	}

	protected function render_raw( ) {
		$settings = $this->get_settings_for_display();
		extract($settings);

		$circleMenuOption = [
			'menuDirection' => $ekit_cm_item_direction,
			'menuDiameter' => $ekit_cm_item_diameter,
			'menuRadius' => $ekit_cm_item_radius,
			'menuSpeed' => $ekit_cm_item_speed,
			'menuDelay' => $ekit_cm_item_delay,
			'menuStepOut' => $ekit_cm_item_step_out,
			'menuStepIn' => $ekit_cm_item_step_in,
			'menuTrigger' => $ekit_cm_item_trigger,
			'menuTransition' => $ekit_cm_item_transition
		];

		$this->add_render_attribute( 'ekit-circle-menu-wrapper', 'data-settings', wp_json_encode($circleMenuOption) );

		?>
			<div class="ekit-circle-menu-wrapper" <?php $this->print_render_attribute_string('ekit-circle-menu-wrapper'); ?>>
				<ul class="ekit-circle-menu-box">
					<?php foreach($settings['ekit_cm_content'] as $index => $item) : !empty($item['ekit_cm_website_link']['url']) &&$this->add_link_attributes('ekit_cm_website_link'.$item['_id'], $item['ekit_cm_website_link']);
					?>
						<li class="<?php echo $index === 0 ? 'ekit-circle-menu-item-first' : 'ekit-circle-menu-item-list'; ?>">
							<a class="ekit-circle-menu-item" <?php $this->print_render_attribute_string('ekit_cm_website_link'.$item['_id']); ?>>
								<span class="ekit-circle-menu-wrapper">
									<?php if (!empty($item['ekit_cm_icon']['value'])) : ?>
										<?php Icons_Manager::render_icon( $item['ekit_cm_icon'], [ 'aria-hidden' => 'true' ] ); ?>
									<?php endif; ?>

									<?php if (!empty($item['ekit_cm_tooltip'])) : ?>
										<span class="ekit-circle-menu-item-tooltip"><?php echo wp_kses($item['ekit_cm_tooltip'], \ElementsKit_Lite\Utils::get_kses_array()); ?></span>
									<?php endif; ?>

									<?php if (!empty($item['ekit_cm_title'])) : ?>
										<span class="ekit-circle-menu-item-title"><?php echo wp_kses($item['ekit_cm_title'], \ElementsKit_Lite\Utils::get_kses_array()); ?></span>
									<?php endif; ?>
								</span>

								<?php if ($index === 0) : ?>
									<span class="ekit-circle-menu-close">
										<i aria-hidden="true" class="icon icon-cancel"></i>
									</span>
								<?php endif; ?>
							</a>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>
		<?php
	}
}