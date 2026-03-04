<?php
namespace Elementor;

use Elementor\Controls_Manager;

defined('ABSPATH') || die();

class ElementsKit_Badge {
	public function __construct() {
		add_action('elementor/element/common/_section_style/after_section_end', [$this, 'register_controls'], 5);

		// Pure PHP render: filter final widget/section/column/container HTML.
		add_filter( 'elementor/widget/render_content',   [ $this, 'append_badge' ], 10, 2 );

		// JS Template render: filter final widget/section/column/container template.
		add_filter( 'elementor/widget/print_template', [ $this, 'append_badge_template' ], 10, 2 );
	}

	/**
	 * Enqueue badge frontend scripts and styles.
	 *
	 * @since 2.9.0
	 * @access public
	 */
	public function enqueue_frontend_scripts($key = 'ekit_enable_badge') {
		return [
			'styles' => [
				[
					'name' => 'ekit-badge',
					'conditions' => [
						'terms' => [
							[
								'name' => $key,
								'operator' => '===',
								'value' => 'yes',
							],
						],
					],
				],
			],
			'scripts' => [
				[
					'name' => 'lottie',
					'conditions' => [
						'terms' => [
							[
								'name' => $key,
								'operator' => '===',
								'value' => 'yes',
							],
							[
								'name' => 'ekit_badge_icon_type',
								'operator' => '===',
								'value' => 'lottie',
							]
						],
					],
				],
				[
					'name' => 'ekit-badge',
					'conditions' => [
						'terms' => [
							[
								'name' => $key,
								'operator' => '===',
								'value' => 'yes',
							],
							// [
							// 	'name' => 'ekit_badge_icon_type',
							// 	'operator' => '===',
							// 	'value' => 'lottie',
							// ]
						],
					],
				],
			],
		];
	}

	/**
	 * Register badge controls.
	 *
	 * @since 2.9.0
	 * @access public
	 */
	public function register_controls( $element ) {
		$element->start_controls_section(
			'ekit_badge',
			[
				'label' => esc_html__('ElementsKit Badge', 'elementskit'),
				'tab'   => Controls_Manager::TAB_ADVANCED,
			]
		);

		$element->add_control(
			'ekit_enable_badge',
			[
				'label'              => esc_html__('Enable Badge', 'elementskit'),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'elementskit' ),
				'label_off'          => esc_html__( 'No', 'elementskit' ),
				'return_value'       => 'yes',
				'default'            => '',
				'prefix_class'        => 'ekit-badge-',
				'render_type'        => 'template',
				'assets'             => $this->enqueue_frontend_scripts(),
			]
		);

		$element->start_controls_tabs(
			'ekit_badge_tabs',
			[
				'condition' => [
					'ekit_enable_badge' => 'yes',
				],
			]
		);

		$element->start_controls_tab(
			'ekit_badge_content_tab',
			[
				'label' => esc_html__('Content', 'elementskit'),
			]
		);

		$element->add_control(
			'ekit_badge_label',
			[
				'label'              => esc_html__('Label', 'elementskit'),
				'type'               => Controls_Manager::TEXT,
				'default'            => esc_html__('Offer', 'elementskit'),
				'render_type'        => 'template',
				'dynamic'            => [
					'active' => true,
				],
			]
		);

		$element->add_control(
			'ekit_badge_preset',
			[
				'label'              => esc_html__('Presets', 'elementskit'),
				'type'               => Controls_Manager::SELECT2,
				'default'            => '1',
				'render_type'        => 'template',
				'options'            => [
					'1' => esc_html__('1', 'elementskit'),
					'2' => esc_html__('2', 'elementskit'),
					'3' => esc_html__('3', 'elementskit'),
					'4' => esc_html__('4', 'elementskit'),
					'5' => esc_html__('5', 'elementskit'),
					'6' => esc_html__('6', 'elementskit'),
					'7' => esc_html__('7', 'elementskit'),
					'8' => esc_html__('8', 'elementskit'),
					'9' => esc_html__('9', 'elementskit'),
					'10' => esc_html__('10', 'elementskit'),
					'11' => esc_html__('11', 'elementskit'),
					'12' => esc_html__('12', 'elementskit'),
					'13' => esc_html__('13', 'elementskit'),
					'14' => esc_html__('14', 'elementskit'),
					'15' => esc_html__('15', 'elementskit'),
					'16' => esc_html__('16', 'elementskit'),
					'17' => esc_html__('17', 'elementskit'),
					'18' => esc_html__('18', 'elementskit'),
					'19' => esc_html__('19', 'elementskit'),
					'stripe' => esc_html__('Stripe', 'elementskit'),
					'triangle' => esc_html__('Triangle', 'elementskit'),
				],
				'condition'          => [
					'ekit_enable_badge' => 'yes',
				],
			]
		);

		$element->add_control(
			'ekit_badge_icon_type',
			[
				'label'              => esc_html__('Icon Type', 'elementskit'),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'none',
				'render_type'        => 'template',
				'options'            => [
					'none'   => esc_html__('None', 'elementskit'),
					'icon'   => esc_html__('Icon', 'elementskit'),
					'image'  => esc_html__('Image', 'elementskit'),
					'lottie' => esc_html__('Lottie', 'elementskit'),
				],
			]
		);

		$element->add_control(
			'ekit_badge_icon_direction',
			array(
				'label'        => __( 'Icon Direction', 'elementskit' ),
				'type'         => Controls_Manager::CHOOSE,
				'toggle'       => false,
				'options'      => array(
					'row'    => array(
						'title' => __( 'Row - horizontal', 'elementskit' ),
						'icon'  => 'eicon-arrow-right',
					),
					'column' => array(
						'title' => __( 'Column - verticle', 'elementskit' ),
						'icon'  => 'eicon-arrow-down',
					),
					'row-reverse' => array(
						'title' => __( 'Row - reversed', 'elementskit' ),
						'icon'  => 'eicon-arrow-left',
					),
					'column-reverse' => array(
						'title' => __( 'Column - reversed', 'elementskit' ),
						'icon'  => 'eicon-arrow-up',
					),
				),
				'default'      => 'row',
				'condition' => [
					'ekit_enable_badge' => 'yes',
					'ekit_badge_icon_type!' => 'none',
				],
				'selectors'    => array(
					'{{WRAPPER}} .ekit-badge-inner' => 'flex-direction: {{VALUE}};',
				),
			)
		);

		$element->add_control(
			'ekit_badge_icon',
			[
				'label'              => esc_html__('Icon', 'elementskit'),
				'type'               => Controls_Manager::ICONS,
				'default'            => [
					'value'   => 'fas fa-bell',
					'library' => 'fa-solid',
				],
				'condition'          => [
					'ekit_badge_icon_type' => 'icon',
				],
			]
		);

		$element->add_control(
			'ekit_badge_image',
			[
				'label'              => esc_html__('Image', 'elementskit'),
				'type'               => Controls_Manager::MEDIA,
				'media_type'         => 'image',
				'condition'          => [
					'ekit_badge_icon_type' => 'image',
				],
			]
		);

		$element->add_control(
			'ekit_badge_lottie_source',
			[
				'label' => esc_html__( 'Source', 'elementskit' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'media_file',
				'options' => [
					'media_file' => esc_html__( 'Media File', 'elementskit' ),
					'external_url' => esc_html__( 'External URL', 'elementskit' ),
				],
				'condition'          => [
					'ekit_badge_icon_type' => 'lottie',
				],
			]
		);

		$element->add_control(
			'ekit_badge_lottie_json',
			[
				'label' => esc_html__( 'Upload JSON File', 'elementskit' ),
				'type' => Controls_Manager::MEDIA,
				'media_types' => [ 'application/json' ],
				'condition' => [
					'ekit_badge_icon_type' => 'lottie',
					'ekit_badge_lottie_source' => 'media_file',
				],
			]
		);

		$element->add_control(
			'ekit_badge_lottie_url',
			[
				'label' => esc_html__( 'External URL', 'elementskit' ),
				'placeholder' => esc_html__( 'Enter your URL', 'elementskit' ),
				'type' => Controls_Manager::URL,
				'options' => false,
				'dynamic' => [
					'active' => true,
				],
				'condition' => [
					'ekit_badge_icon_type' => 'lottie',
					'ekit_badge_lottie_source' => 'external_url',
				],
			]
		);

		$element->add_control(
			'ekit_badge_lottie_loop',
			[
				'label'              => esc_html__('Loop', 'elementskit'),
				'type'               => Controls_Manager::SWITCHER,
				'return_value'       => 'yes',
				'render_type'        => 'template',
				'condition'          => [
					'ekit_badge_icon_type' => 'lottie',
				],
			]
		);

		$element->add_control(
			'ekit_badge_lottie_reverse',
			[
				'label'              => esc_html__('Reverse', 'elementskit'),
				'type'               => Controls_Manager::SWITCHER,
				'return_value'       => 'yes',
				'render_type'        => 'template',
				'condition'          => [
					'ekit_badge_icon_type' => 'lottie',
					'ekit_badge_lottie_loop' => 'yes',
				],
			]
		);

		$element->add_control(
			'ekit_badge_floating_effects',
			[
				'label'              => esc_html__('Floating Effects', 'elementskit'),
				'type'               => Controls_Manager::SWITCHER,
				'return_value'       => 'yes',
				'separator'          => 'before',
			]
		);

		$element->add_control(
			'ekit_badge_floating_effects_opacity',
			[
				'label' => esc_html__( 'Opacity', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
				],
			]
		);

		$element->start_popover();

		$element->add_control(
			'ekit_badge_floating_effects_opacity_value',
			[
				'label' => esc_html__( 'Value', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'sizes' => [
						'start' => 0,
						'end'   => 50,
					],
					'unit'  => '%',
				],
				'labels' => [
					esc_html__( 'From', 'elementskit' ),
					esc_html__( 'To', 'elementskit' ),
				],
				'scales'    => 1,
				'handles'   => 'range',
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
					'ekit_badge_floating_effects_opacity' => 'yes',
				],
			]
		);

		$element->add_control(
			'ekit_badge_floating_effects_opacity_speed',
			[
				'label' => esc_html__( 'Speed (s)', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 0.1,
					),
				),
				'default'   => array(
					'size' => 1,
				),
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
					'ekit_badge_floating_effects_opacity' => 'yes',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_floating_effects_blur',
			[
				'label' => esc_html__( 'Blur', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
				],
			]
		);

		$element->start_popover();

		$element->add_control(
			'ekit_badge_floating_effects_blur_value',
			[
				'label' => esc_html__( 'Value', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'sizes' => [
						'start' => 0,
						'end'   => 1,
					],
					'unit'  => 'px',
				],
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 3,
						'step' => 0.1,
					],
				],
				'labels' => [
					esc_html__( 'From', 'elementskit' ),
					esc_html__( 'To', 'elementskit' ),
				],
				'scales' => 2,
				'handles' => 'range',
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
					'ekit_badge_floating_effects_blur' => 'yes',
				],
			]
		);

		$element->add_control(
			'ekit_badge_floating_effects_blur_speed',
			[
				'label' => esc_html__( 'Speed (s)', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 0.1,
					),
				),
				'default'   => array(
					'size' => 1,
				),
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
					'ekit_badge_floating_effects_blur' => 'yes',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_floating_effects_grayscale',
			[
				'label' => esc_html__( 'Grayscale', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
				],
			]
		);

		$element->start_popover();

		$element->add_control(
			'ekit_badge_floating_effects_grayscale_value',
			[
				'label' => esc_html__( 'Value', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'sizes' => [
						'start' => 0,
						'end'   => 100,
					],
					'unit'  => '%',
				],
				'labels' => [
					esc_html__( 'From', 'elementskit' ),
					esc_html__( 'To', 'elementskit' ),
				],
				'scales'    => 1,
				'handles'   => 'range',
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
					'ekit_badge_floating_effects_grayscale' => 'yes',
				],
			]
		);

		$element->add_control(
			'ekit_badge_floating_effects_grayscale_speed',
			[
				'label' => esc_html__( 'Speed (s)', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => array(
					'px' => array(
						'min'  => 0,
						'max'  => 10,
						'step' => 0.1,
					),
				),
				'default'   => array(
					'size' => 1,
				),
				'condition' => [
					'ekit_badge_floating_effects' => 'yes',
					'ekit_badge_floating_effects_grayscale' => 'yes',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_section_heading',
			[
				'label' => esc_html__( 'Badge', 'elementskit' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$element->add_control(
			'ekit_badge_size',
			[
				'label' => esc_html__( 'Size', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$element->start_popover();

		$element->add_responsive_control(
			'ekit_badge_width',
			[
				'label'              => esc_html__('Width', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'size_units'         => ['px', '%'],
				'range'              => [
					'px' => [
						'min' => 0,
						'max' => 200,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_size' => 'yes',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_height',
			[
				'label'              => esc_html__('Heigh', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'size_units'         => ['px', '%'],
				'range'              => [
					'px' => [
						'min' => 0,
						'max' => 200,
					],
					'%'  => [
						'min' => 0,
						'max' => 100,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_size' => 'yes',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_position',
			[
				'label' => esc_html__( 'Position', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$element->start_popover();

		$element->add_control(
			'ekit_badge_horizontal_position',
			[
				'label'              => esc_html__('Horizontal Orientation', 'elementskit'),
				'type'               => Controls_Manager::CHOOSE,
				'toggle'             => false,
				'default'            => 'right',
				'options'            => [
					'left'  => [
						'title' => 'Left',
						'icon'  => 'eicon-h-align-left',
					],
					'right' => [
						'title' => 'Right',
						'icon'  => 'eicon-h-align-right',
					],
				],
				'condition'          => [
					'ekit_badge_position' => 'yes',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_horizontal_position_offset_left',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [

				],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_position' => 'yes',
					'ekit_badge_horizontal_position' => 'left',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'left: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_horizontal_position_offset_right',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_position' => 'yes',
					'ekit_badge_horizontal_position' => 'right',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'right: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_control(
			'ekit_badge_vertical_position',
			[
				'label'              => esc_html__('Vertical Orientation', 'elementskit'),
				'type'               => Controls_Manager::CHOOSE,
				'toggle'             => false,
				'default'            => 'top',
				'options'            => [
					'top'    => [
						'title' => esc_html__('Top', 'elementskit'),
						'icon'  => 'eicon-v-align-top',
					],
					'bottom' => [
						'title' => esc_html__('Bottom', 'elementskit'),
						'icon'  => 'eicon-v-align-bottom',
					],
				],
				'condition'          => [
					'ekit_badge_position' => 'yes',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_vertical_position_offset_top',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_position' => 'yes',
					'ekit_badge_vertical_position' => 'top',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'top: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_vertical_position_offset_bottom',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_position' => 'yes',
					'ekit_badge_vertical_position' => 'bottom',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'bottom: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_rotate',
			[
				'label' => esc_html__( 'Rotate', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$element->start_popover();

		$element->add_responsive_control(
			"ekit_badge_rotate_z",
			[
				'label' => esc_html__( 'Rotate Z', 'elementskit' )  . ' (deg)',
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => -360,
						'max' => 360,
					],
				],
				'condition'          => [
					'ekit_badge_rotate' => 'yes',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'transform: rotateZ({{SIZE}}deg);',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_ribbon',
			[
				'label' => esc_html__( 'Ribbon', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
				'condition' => [
					'ekit_badge_preset!' => ['stripe', 'triangle'],
				],
			]
		);

		$element->start_popover();

		$element->add_responsive_control(
			"ekit_badge_ribbon_size",
			[
				'label' => esc_html__( 'Size', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_ribbon' => 'yes',
					'ekit_badge_preset' => ['1', '2'],
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => '--s: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			"ekit_badge_ribbon_depth",
			[
				'label' => esc_html__( 'Depth', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_ribbon' => 'yes',
					'ekit_badge_preset' => ['1', '2', '3', '4'],
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => '--d: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			"ekit_badge_ribbon_cutout",
			[
				'label' => esc_html__( 'Cutout', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_ribbon' => 'yes',
					'ekit_badge_preset' => ['1', '2'],
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => '--c: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			"ekit_badge_ribbon_fold",
			[
				'label' => esc_html__( 'Fold', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_ribbon' => 'yes',
					'ekit_badge_preset' => ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => '--f: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			"ekit_badge_ribbon_shape",
			[
				'label' => esc_html__( 'Shape', 'elementskit' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default'            => [],
				'condition'          => [
					'ekit_badge_ribbon' => 'yes',
					'ekit_badge_preset' => ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'],
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => '--r: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_label_section_heading',
			[
				'label' => esc_html__( 'Label', 'elementskit' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$element->add_control(
			'ekit_badge_label_position',
			[
				'label' => esc_html__( 'Position', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge-inner' => 'position: absolute;',
				],
			]
		);

		$element->start_popover();

		$element->add_control(
			'ekit_badge_label_horizontal_position',
			[
				'label'              => esc_html__('Horizontal Orientation', 'elementskit'),
				'type'               => Controls_Manager::CHOOSE,
				'toggle'             => false,
				'default'            => 'right',
				'options'            => [
					'left'  => [
						'title' => 'Left',
						'icon'  => 'eicon-h-align-left',
					],
					'right' => [
						'title' => 'Right',
						'icon'  => 'eicon-h-align-right',
					],
				],
				'condition'          => [
					'ekit_badge_label_position' => 'yes',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_label_horizontal_position_offset_left',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_label_position' => 'yes',
					'ekit_badge_label_horizontal_position' => 'left',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge-inner' => 'left: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_label_horizontal_position_offset_right',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_label_position' => 'yes',
					'ekit_badge_label_horizontal_position' => 'right',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge-inner' => 'right: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_control(
			'ekit_badge_label_vertical_position',
			[
				'label'              => esc_html__('Vertical Orientation', 'elementskit'),
				'type'               => Controls_Manager::CHOOSE,
				'toggle'             => false,
				'default'            => 'top',
				'options'            => [
					'top'    => [
						'title' => esc_html__('Top', 'elementskit'),
						'icon'  => 'eicon-v-align-top',
					],
					'bottom' => [
						'title' => esc_html__('Bottom', 'elementskit'),
						'icon'  => 'eicon-v-align-bottom',
					],
				],
				'condition'          => [
					'ekit_badge_label_position' => 'yes',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_label_vertical_position_offset_top',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_label_position' => 'yes',
					'ekit_badge_label_vertical_position' => 'top',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge-inner' => 'top: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_label_vertical_position_offset_bottom',
			[
				'label'              => esc_html__('Offset', 'elementskit'),
				'type'               => Controls_Manager::SLIDER,
				'range'              => [
					'px' => [
						'min'  => -200,
						'max'  => 200,
						'step' => 1,
					],
					'%'  => [
						'min' => -100,
						'max' => 100,
					],
				],
				'default'            => [],
				'size_units'         => ['px', '%'],
				'condition'          => [
					'ekit_badge_label_position' => 'yes',
					'ekit_badge_label_vertical_position' => 'bottom',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge-inner' => 'bottom: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_label_rotate',
			[
				'label' => esc_html__( 'Rotate', 'elementskit' ),
				'type' => Controls_Manager::POPOVER_TOGGLE,
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$element->start_popover();

		$element->add_responsive_control(
			"ekit_badge_label_rotate_z",
			[
				'label' => esc_html__( 'Rotate Z', 'elementskit' )  . ' (deg)',
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => -360,
						'max' => 360,
					],
				],
				'condition'          => [
					'ekit_badge_label_rotate' => 'yes',
				],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge-inner' => 'transform: rotateZ({{SIZE}}deg);',
				],
			]
		);

		$element->end_popover();

		$element->add_control(
			'ekit_badge_unset_overflow',
			[
				'label'              => esc_html__('Unset Overflow', 'elementskit'),
				'description'        => esc_html__('It will remove parent DIV element overflow to show badge properly in case of using clipping.', 'elementskit'),
				'type'               => Controls_Manager::SWITCHER,
				'return_value'       => 'yes',
				'separator'          => 'before',
				'selectors'          => [
					'{{WRAPPER}}.ekit-badge-yes' => 'overflow: visible;',
				],
			]
		);

		$element->end_controls_tab();

		$element->start_controls_tab(
			'ekit_badge_style_tab',
			[
				'label' => esc_html__('Style', 'elementskit'),
			]
		);

		$element->add_control(
			'ekit_badge_badge_label_heading',
			[
				'label'     => esc_html__('Badge & Label', 'elementskit'),
				'type'      => Controls_Manager::HEADING,
			]
		);

		$element->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'ekit_badge_text_typography',
				'label'    => esc_html__('Typography', 'elementskit'),
				'selector' => '{{WRAPPER}} .ekit-badge-inner',
			]
		);

		$element->add_control(
			'ekit_badge_text_color',
			[
				'label'     => esc_html__('Label Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-badge' => 'color: {{VALUE}}',
				],
			]
		);

		$element->add_control(
			'ekit_badge_text_background',
			[
				'label'     => esc_html__('Badge Background', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-badge' => 'background-color: {{VALUE}}',
				],
			]
		);

		$element->add_control(
			'ekit_badge_border_radius',
			[
				'label'      => esc_html__('Border Radius', 'elementskit'),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => ['px', '%'],
				'separator'  => 'before',
				'selectors'  => [
					'{{WRAPPER}} .ekit-badge' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$element->add_responsive_control(
			'ekit_badge_padding',
			[
				'label'              => esc_html__( 'Padding', 'elementskit' ),
				'type'               => Controls_Manager::DIMENSIONS,
				'size_units'         => [ 'px', 'em', '%' ],
				'selectors'          => [
					'{{WRAPPER}} .ekit-badge' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$element->add_control(
			'ekit_badge_zindex',
			[
				'label'     => esc_html__('Z-index', 'elementskit'),
				'type'      => Controls_Manager::NUMBER,
				'selectors' => [
					'{{WRAPPER}} .ekit-badge' => 'z-index: {{VALUE}};',
				],
			]
		);

		$element->add_control(
			'ekit_badge_icon_heading',
			[
				'label'     => esc_html__('Icon', 'elementskit'),
				'type'      => Controls_Manager::HEADING,
				'separator' => 'before',
				'condition' => [
					'ekit_badge_icon_type' => ['icon', 'image', 'lottie'],
				],
			]
		);

		$element->add_control(
			'ekit_badge_icon_size',
			[
				'label'      => esc_html__('Size', 'elementskit'),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => ['px'],
				'range'      => [
					'px' => [
						'min' => 0,
						'max' => 50,
					],
				],
				'default'    => [],
				'selectors'  => [
					'{{WRAPPER}} .ekit-badge :is(i, svg)' => 'font-size: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .ekit-badge :is(.ekit-badge-icon-image, .ekit-badge-icon-lottie)' => 'width:{{SIZE}}{{UNIT}};height:{{SIZE}}{{UNIT}};line-height:{{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'ekit_badge_icon_type' => ['icon', 'image', 'lottie'],
				],
			]
		);

		$element->add_control(
			'ekit_badge_icon_color',
			[
				'label'     => esc_html__('Icon Color', 'elementskit'),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .ekit-badge :is(i, svg)' => 'color: {{VALUE}}; fill: {{VALUE}};',
				],
				'condition' => [
					'ekit_badge_icon_type' => 'icon',
				],
			]
		);

		$element->end_controls_tab();
		$element->end_controls_tabs();
		$element->end_controls_section();
	}

	/**
	 * Render badge output on the frontend.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	public function append_badge( $widget_content, $widget ) {
		// Only proceed if controls exist on this element type.
		$settings = $widget->get_settings_for_display();
		extract($settings);

		if ( empty( $ekit_enable_badge ) || 'yes' !== $ekit_enable_badge ) {
			return $widget_content;
		}

		// Prepare badge label.
		$label = ! empty( $ekit_badge_label ) ? esc_html( $ekit_badge_label ) : '';

		// Icon/Image/Lottie handling.
		$icon_html = '';
		switch ( $ekit_badge_icon_type ?? 'none' ) {
			case 'icon':
				if ( ! empty( $ekit_badge_icon['value'] ) ) {
					$icon_html = Icons_Manager::try_get_icon_html( $ekit_badge_icon );
				}
				break;

			case 'image':
				if ( ! empty( $ekit_badge_image['url'] ) ) {
					$icon_html = sprintf(
						'<img src="%s" alt="%s" class="ekit-badge-icon-image" />',
						esc_url( $ekit_badge_image['url'] ),
						esc_attr( $label )
					);
				}
				break;

			case 'lottie':
				if ( ! empty( $ekit_badge_lottie_url['url'] ) || ! empty( $ekit_badge_lottie_json['url'] ) ) {
					$lottie_url = '';
					if($ekit_badge_lottie_source === 'external_url') {
						$lottie_url = $ekit_badge_lottie_url['url'];
					}
					if($ekit_badge_lottie_source === 'media_file') {
						$lottie_url = esc_url( $ekit_badge_lottie_json['url'] );
					}

					$lottie_atts = [
						'src'      => $lottie_url,
						'autoplay' => true, // always autoplay
						'loop'     => ( ! empty( $ekit_badge_lottie_loop ) && 'yes' === $ekit_badge_lottie_loop ),
						'reverse'  => ( ! empty( $ekit_badge_lottie_reverse ) && 'yes' === $ekit_badge_lottie_reverse ),
						'renderer' => 'canvas',
					];

					$attr_str = sprintf( 'data-path="%s" data-renderer="%s"', $lottie_atts['src'], esc_attr( $lottie_atts['renderer'] ) );

					// Conditionally add boolean attributes
					if ( ! empty( $lottie_atts['autoplay'] ) ) {
						$attr_str .= ' autoplay';
					}
					if ( ! empty( $lottie_atts['loop'] ) ) {
						$attr_str .= ' loop';
					}
					if ( ! empty( $lottie_atts['reverse'] ) ) {
						$attr_str .= ' reverse';
					}

					$icon_html = sprintf(
						'<div class="ekit-badge-icon-lottie" %s></div>',
						$attr_str
					);
				}
				break;
		}

		// Combine label + icon based on position.
		$badge_inner = '';
		if ( $label || $icon_html ) {
			if ( ! empty( $ekit_badge_icon_position ) && 'before' === $ekit_badge_icon_position ) {
				$badge_inner = $icon_html . '<span class="ekit-badge-label">' . $label . '</span>';
			} else {
				$badge_inner = '<span class="ekit-badge-label">' . $label . '</span>' . $icon_html;
			}
		}

		$widget->add_render_attribute( 'badge', 'class',  [
			'ekit-badge',
			'ekit-badge-' . esc_attr( $ekit_badge_horizontal_position ?? 'right' ),
			'ekit-badge-' . esc_attr( $ekit_badge_vertical_position ?? 'top' ),
		] );

		// Conditionally add ribbon classes
		if ( ! empty( $ekit_badge_preset ) ) {
			$widget->add_render_attribute( 'badge', 'class',  'ekit-badge-preset-' . esc_attr( $ekit_badge_preset ) );
		}

		// Opacity effect data attributes
		if ( ! empty( $ekit_badge_floating_effects_opacity_value['sizes'] ) ) {
			$widget->add_render_attribute( 'badge', 'data-opacity',  wp_json_encode($ekit_badge_floating_effects_opacity_value['sizes']) );
			$widget->add_render_attribute( 'badge', 'data-opacity-speed',  esc_attr($ekit_badge_floating_effects_opacity_speed['size'] ?? 1) );
		}

		// Blur effect data attributes
		if ( ! empty( $ekit_badge_floating_effects_blur_value['sizes'] ) ) {
			$widget->add_render_attribute( 'badge', 'data-blur',  wp_json_encode($ekit_badge_floating_effects_blur_value['sizes']) );
			$widget->add_render_attribute( 'badge', 'data-blur-speed',  esc_attr($ekit_badge_floating_effects_blur_speed['size'] ?? 1) );
		}

		// Grayscale effect data attributes
		if ( ! empty( $ekit_badge_floating_effects_grayscale_value['sizes'] ) ) {
			$widget->add_render_attribute( 'badge', 'data-grayscale',  wp_json_encode($ekit_badge_floating_effects_grayscale_value['sizes']) );
			$widget->add_render_attribute( 'badge', 'data-grayscale-speed',  esc_attr($ekit_badge_floating_effects_grayscale_speed['size'] ?? 1) );
		}

		// Final badge markup
		$badge_html = sprintf(
			'<div %1$s><div class="ekit-badge-inner">%2$s</div></div>',
			$widget->get_render_attribute_string( 'badge' ),
			$badge_inner
		);

		if( ! empty( $badge_html ) ) {
			$widget_content = $badge_html . $widget_content;
		}

		return $widget_content;
	}

	/**
	 * Render badge output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	public function append_badge_template( $template, $widget ) {
		// If the widget doesn't have a JS template, skip - let PHP render_content filter handle it
		if ( empty( $template ) ) {
			return $template;
		}

		ob_start();
		?>
		<# if ( settings.ekit_enable_badge === "yes" ) { #>
		<#
		var label       = settings.ekit_badge_label ? _.escape( settings.ekit_badge_label ) : "";
		var iconType    = settings.ekit_badge_icon_type || "none";
		var hasIcon     = ( iconType === "icon" && settings.ekit_badge_icon && settings.ekit_badge_icon.value ) ||
		                  ( iconType === "image" && settings.ekit_badge_image && settings.ekit_badge_image.url ) ||
		                  ( iconType === "lottie" && ( ( settings.ekit_badge_lottie_source === 'external_url' && settings.ekit_badge_lottie_url && settings.ekit_badge_lottie_url.url ) || ( settings.ekit_badge_lottie_json && settings.ekit_badge_lottie_json.url ) ) );

		var badgeClasses = [
			"ekit-badge",
			"ekit-badge-" + ( settings.ekit_badge_horizontal_position || "right" ),
			"ekit-badge-" + ( settings.ekit_badge_vertical_position || "top" )
		];

		if ( settings.ekit_badge_preset ) {
			badgeClasses.push( 'ekit-badge-preset-' + settings.ekit_badge_preset );
		}

		var badgeDataAttrs = "";

		if ( settings.ekit_badge_floating_effects === 'yes' && settings.ekit_badge_floating_effects_opacity === 'yes' && settings.ekit_badge_floating_effects_opacity_value && settings.ekit_badge_floating_effects_opacity_value.sizes ) {
			badgeDataAttrs += ' data-opacity="' + JSON.stringify( settings.ekit_badge_floating_effects_opacity_value.sizes ).replace(/"/g, '&quot;') + '"';
			badgeDataAttrs += ' data-opacity-speed="' + ( settings.ekit_badge_floating_effects_opacity_speed ? settings.ekit_badge_floating_effects_opacity_speed.size : 1 ) + '"';
		}

		if ( settings.ekit_badge_floating_effects === 'yes' && settings.ekit_badge_floating_effects_blur === 'yes' && settings.ekit_badge_floating_effects_blur_value && settings.ekit_badge_floating_effects_blur_value.sizes ) {
			badgeDataAttrs += ' data-blur="' + JSON.stringify( settings.ekit_badge_floating_effects_blur_value.sizes ).replace(/"/g, '&quot;') + '"';
			badgeDataAttrs += ' data-blur-speed="' + ( settings.ekit_badge_floating_effects_blur_speed ? settings.ekit_badge_floating_effects_blur_speed.size : 1 ) + '"';
		}

		if ( settings.ekit_badge_floating_effects === 'yes' && settings.ekit_badge_floating_effects_grayscale === 'yes' && settings.ekit_badge_floating_effects_grayscale_value && settings.ekit_badge_floating_effects_grayscale_value.sizes ) {
			badgeDataAttrs += ' data-grayscale="' + JSON.stringify( settings.ekit_badge_floating_effects_grayscale_value.sizes ).replace(/"/g, '&quot;') + '"';
			badgeDataAttrs += ' data-grayscale-speed="' + ( settings.ekit_badge_floating_effects_grayscale_speed ? settings.ekit_badge_floating_effects_grayscale_speed.size : 1 ) + '"';
		}
		#>
		<div class="{{ badgeClasses.join(' ') }}"{{{ badgeDataAttrs }}}>
			<div class="ekit-badge-inner">

				<# if ( settings.ekit_badge_icon_position === "before" && hasIcon ) { #>
					<# if ( iconType === "icon" && settings.ekit_badge_icon && settings.ekit_badge_icon.value ) { #>
						<# var iconObj = elementor.helpers.renderIcon( view, settings.ekit_badge_icon, {}, "i", "object" ); #>
						<# if ( iconObj ) { #>
							{{{ iconObj.value }}}
						<# } #>
					<# } else if ( iconType === "image" && settings.ekit_badge_image && settings.ekit_badge_image.url ) { #>
						<img src="{{ settings.ekit_badge_image.url }}" alt="{{ label }}" class="ekit-badge-icon-image"/>
					<# } else if ( iconType === "lottie" ) { #>
						<#
						var lottieURL = "";
						if ( settings.ekit_badge_lottie_source === 'external_url' && settings.ekit_badge_lottie_url && settings.ekit_badge_lottie_url.url ) {
							lottieURL = settings.ekit_badge_lottie_url.url;
						} else if ( settings.ekit_badge_lottie_json && settings.ekit_badge_lottie_json.url ) {
							lottieURL = settings.ekit_badge_lottie_json.url;
						}
						#>
						<# if ( lottieURL ) { #>
							<div class="ekit-badge-icon-lottie" data-path="{{ lottieURL }}" data-renderer="canvas" autoplay<# if ( settings.ekit_badge_lottie_loop === 'yes' ) { #> loop<# } #><# if ( settings.ekit_badge_lottie_reverse === 'yes' ) { #> reverse<# } #>></div>
						<# } #>
					<# } #>
				<# } #>

				<# if ( label ) { #>
					<span class="ekit-badge-label">{{{ label }}}</span>
				<# } #>

				<# if ( settings.ekit_badge_icon_position !== "before" && hasIcon ) { #>
					<# if ( iconType === "icon" && settings.ekit_badge_icon && settings.ekit_badge_icon.value ) { #>
						<# var iconObj = elementor.helpers.renderIcon( view, settings.ekit_badge_icon, {}, "i", "object" ); #>
						<# if ( iconObj ) { #>
							{{{ iconObj.value }}}
						<# } #>
					<# } else if ( iconType === "image" && settings.ekit_badge_image && settings.ekit_badge_image.url ) { #>
						<img src="{{ settings.ekit_badge_image.url }}" alt="{{ label }}" class="ekit-badge-icon-image"/>
					<# } else if ( iconType === "lottie" ) { #>
						<#
						var lottieURL = "";
						if ( settings.ekit_badge_lottie_source === 'external_url' && settings.ekit_badge_lottie_url && settings.ekit_badge_lottie_url.url ) {
							lottieURL = settings.ekit_badge_lottie_url.url;
						} else if ( settings.ekit_badge_lottie_json && settings.ekit_badge_lottie_json.url ) {
							lottieURL = settings.ekit_badge_lottie_json.url;
						}
						#>
						<# if ( lottieURL ) { #>
							<div class="ekit-badge-icon-lottie" data-path="{{ lottieURL }}" data-renderer="canvas" autoplay<# if ( settings.ekit_badge_lottie_loop === 'yes' ) { #> loop<# } #><# if ( settings.ekit_badge_lottie_reverse === 'yes' ) { #> reverse<# } #>></div>
						<# } #>
					<# } #>
				<# } #>

			</div>
		</div>
		<# } #>
		<?php
		$badge_template = ob_get_clean();

		return $badge_template . $template;
	}
}
