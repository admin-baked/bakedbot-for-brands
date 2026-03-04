<?php
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Customizer Custom Controls
 *
 */

if ( class_exists( 'WP_Customize_Control' ) ) {
	/**
	 * Custom Control Base Class
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Custom_Control extends WP_Customize_Control {
		protected $skyrocketCustomControlsCssVersion = '1.3';
		protected $skyrocketCustomControlsJsVersion = '1.2';
		protected function get_skyrocket_resource_url() {
			return INCLUB_THEME_URL . '/inc/customizer/';
		}
	}

	/**
	 * Custom Section Base Class
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Custom_Section extends WP_Customize_Section {
		protected $skyrocketCustomControlsCssVersion = '1.3';
		protected $skyrocketCustomControlsJsVersion = '1.2';
		protected function get_skyrocket_resource_url() {
			return INCLUB_THEME_URL . '/inc/customizer/';
		}
	}

	/**
	 * Image Checkbox Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	 class Skyrocket_Image_Checkbox_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'image_checkbox';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
		?>
			<div class="image_checkbox_control">
				<?php if( !empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php } ?>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo esc_html( $this->description ); ?></span>
				<?php } ?>
				<?php	$chkboxValues = explode( ',', esc_attr( $this->value() ) ); ?>
				<input type="hidden" id="<?php echo esc_attr( $this->id ); ?>" name="<?php echo esc_attr( $this->id ); ?>" value="<?php echo esc_attr( $this->value() ); ?>" class="customize-control-multi-image-checkbox" <?php $this->link(); ?> />
				<?php foreach ( $this->choices as $key => $value ) { ?>
					<label class="checkbox-label">
						<input type="checkbox" name="<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( $key ); ?>" <?php checked( in_array( esc_attr( $key ), $chkboxValues ), 1 ); ?> class="multi-image-checkbox"/>
						<img src="<?php echo esc_attr( $value['image'] ); ?>" alt="<?php echo esc_attr( $value['name'] ); ?>" title="<?php echo esc_attr( $value['name'] ); ?>" />
					</label>
				<?php	} ?>
			</div>
		<?php
		}
	}

	/**
	 * Text Radio Button Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	 class Skyrocket_Text_Radio_Button_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'text_radio_button';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
		?>
			<div class="text_radio_button_control">
				<?php if( !empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php } ?>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo esc_html( $this->description ); ?></span>
				<?php } ?>

				<div class="radio-buttons">
					<?php foreach ( $this->choices as $key => $value ) { ?>
						<label class="radio-button-label">
							<input type="radio" name="<?php echo esc_attr( $this->id ); ?>" value="<?php echo esc_attr( $key ); ?>" <?php $this->link(); ?> <?php checked( esc_attr( $key ), $this->value() ); ?>/>
							<span><?php echo esc_html( $value ); ?></span>
						</label>
					<?php	} ?>
				</div>
			</div>
		<?php
		}
	}

	/**
	 * Image Radio Button Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Image_Radio_Button_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'image_radio_button';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
		?>
			<div class="image_radio_button_control">
				<?php if( !empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php } ?>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo esc_html( $this->description ); ?></span>
				<?php } ?>

				<?php foreach ( $this->choices as $key => $value ) { ?>
					<label class="radio-button-label">
						<input type="radio" name="<?php echo esc_attr( $this->id ); ?>" value="<?php echo esc_attr( $key ); ?>" <?php $this->link(); ?> <?php checked( esc_attr( $key ), $this->value() ); ?>/>
						<img src="<?php echo esc_attr( $value['image'] ); ?>" alt="<?php echo esc_attr( $value['name'] ); ?>" title="<?php echo esc_attr( $value['name'] ); ?>" />
					</label>
				<?php	} ?>
			</div>
		<?php
		}
	}

	/**
	 * Single Accordion Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Single_Accordion_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'single_accordion';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_script( 'skyrocket-custom-controls-js', $this->get_skyrocket_resource_url() . 'js/customizer.js', array( 'jquery' ), $this->skyrocketCustomControlsJsVersion, true );
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
			$allowed_html = array(
				'a' => array(
					'href' => array(),
					'title' => array(),
					'class' => array(),
					'target' => array(),
				),
				'br' => array(),
				'em' => array(),
				'strong' => array(),
				'i' => array(
					'class' => array()
				),
			);
		?>
			<div class="single-accordion-custom-control">
				<div class="single-accordion-toggle"><?php echo esc_html( $this->label ); ?><span class="accordion-icon-toggle dashicons dashicons-plus"></span></div>
				<div class="single-accordion customize-control-description">
					<?php
						if ( is_array( $this->description ) ) {
							echo '<ul class="single-accordion-description">';
							foreach ( $this->description as $key => $value ) {
								echo '<li>' . $key . wp_kses( $value, $allowed_html ) . '</li>';
							}
							echo '</ul>';
						}
						else {
							echo wp_kses( $this->description, $allowed_html );
						}
				  ?>
				</div>
			</div>
		<?php
		}
	}

	/**
	 * Simple Notice Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Simple_Notice_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'simple_notice';
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
			$allowed_html = array(
				'a' => array(
					'href' => array(),
					'title' => array(),
					'class' => array(),
					'target' => array(),
				),
				'br' => array(),
				'em' => array(),
				'strong' => array(),
				'i' => array(
					'class' => array()
				),
				'span' => array(
					'class' => array(),
				),
				'code' => array(),
			);
		?>
			<div class="simple-notice-custom-control">
				<?php if( !empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php } ?>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo wp_kses( $this->description, $allowed_html ); ?></span>
				<?php } ?>
			</div>
		<?php
		}
	}

	/**
	 * Slider Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Slider_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'slider_control';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_script( 'skyrocket-custom-controls-js', $this->get_skyrocket_resource_url() . 'js/customizer.js', array( 'jquery', 'jquery-ui-core' ), $this->skyrocketCustomControlsJsVersion, true );
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
		?>
			<div class="slider-custom-control">
				<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span><input type="number" id="<?php echo esc_attr( $this->id ); ?>" name="<?php echo esc_attr( $this->id ); ?>" value="<?php echo esc_attr( $this->value() ); ?>" class="customize-control-slider-value" <?php $this->link(); ?> />
				<div class="slider" slider-min-value="<?php echo esc_attr( $this->input_attrs['min'] ); ?>" slider-max-value="<?php echo esc_attr( $this->input_attrs['max'] ); ?>" slider-step-value="<?php echo esc_attr( $this->input_attrs['step'] ); ?>"></div><span class="slider-reset dashicons dashicons-image-rotate" slider-reset-value="<?php echo esc_attr( $this->value() ); ?>"></span>
			</div>
		<?php
		}
	}

	/**
	 * Toggle Switch Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Toggle_Switch_Custom_control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'toggle_switch';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue(){
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content(){
		?>
			<div class="toggle-switch-control">
				<div class="toggle-switch">
					<input type="checkbox" id="<?php echo esc_attr($this->id); ?>" name="<?php echo esc_attr($this->id); ?>" class="toggle-switch-checkbox" value="<?php echo esc_attr( $this->value() ); ?>" <?php $this->link(); checked( $this->value() ); ?>>
					<label class="toggle-switch-label" for="<?php echo esc_attr( $this->id ); ?>">
						<span class="toggle-switch-inner"></span>
						<span class="toggle-switch-switch"></span>
					</label>
				</div>
				<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo esc_html( $this->description ); ?></span>
				<?php } ?>
			</div>
		<?php
		}
	}

	/**
	 * Sortable Repeater Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Sortable_Repeater_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'sortable_repeater';
		/**
		 * Button labels
		 */
		public $button_labels = array();
		/**
		 * Constructor
		 */
		public function __construct( $manager, $id, $args = array(), $options = array() ) {
			parent::__construct( $manager, $id, $args );
			// Merge the passed button labels with our default labels
			$this->button_labels = wp_parse_args( $this->button_labels,
				array(
					'add' => __( 'Add', 'inclub' ),
				)
			);
		}
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_script( 'skyrocket-custom-controls-js', $this->get_skyrocket_resource_url() . 'js/customizer.js', array( 'jquery', 'jquery-ui-core' ), $this->skyrocketCustomControlsJsVersion, true );
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
		?>
		  <div class="sortable_repeater_control">
				<?php if( !empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php } ?>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo esc_html( $this->description ); ?></span>
				<?php } ?>
				<input type="hidden" id="<?php echo esc_attr( $this->id ); ?>" name="<?php echo esc_attr( $this->id ); ?>" value="<?php echo esc_attr( $this->value() ); ?>" class="customize-control-sortable-repeater" <?php $this->link(); ?> />
				<div class="sortable_repeater sortable">
					<div class="repeater">
						<input type="text" value="" class="repeater-input" placeholder="https://" /><span class="dashicons dashicons-sort"></span><a class="customize-control-sortable-repeater-delete" href="#"><span class="dashicons dashicons-no-alt"></span></a>
					</div>
				</div>
				<button class="button customize-control-sortable-repeater-add" type="button"><?php echo esc_html($this->button_labels['add']); ?></button>
			</div>
		<?php
		}
	}

	/**
	 * Sortable Pill Checkbox Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Pill_Checkbox_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'pill_checkbox';
		/**
		 * Define whether the pills can be sorted using drag 'n drop. Either false or true. Default = false
		 */
		private $sortable = false;
		/**
		 * The width of the pills. Each pill can be auto width or full width. Default = false
		 */
		private $fullwidth = false;
		/**
		 * Constructor
		 */
		public function __construct( $manager, $id, $args = array(), $options = array() ) {
			parent::__construct( $manager, $id, $args );
			// Check if these pills are sortable
			if ( isset( $this->input_attrs['sortable'] ) && $this->input_attrs['sortable'] ) {
				$this->sortable = true;
			}
			// Check if the pills should be full width
			if ( isset( $this->input_attrs['fullwidth'] ) && $this->input_attrs['fullwidth'] ) {
				$this->fullwidth = true;
			}
		}		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_script( 'skyrocket-custom-controls-js', $this->get_skyrocket_resource_url() . 'js/customizer.js', array( 'jquery', 'jquery-ui-core' ), $this->skyrocketCustomControlsJsVersion, true );
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
			$reordered_choices = array();
			$saved_choices = explode( ',', esc_attr( $this->value() ) );

			// Order the checkbox choices based on the saved order
			if( $this->sortable ) {
				foreach ( $saved_choices as $key => $value ) {
					if( isset( $this->choices[$value] ) ) {
						$reordered_choices[$value] = $this->choices[$value];
					}
				}
				$reordered_choices = array_merge( $reordered_choices, array_diff_assoc( $this->choices, $reordered_choices ) );
			}
			else {
				$reordered_choices = $this->choices;
			}
		?>
			<div class="pill_checkbox_control">
				<?php if( !empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php } ?>
				<?php if( !empty( $this->description ) ) { ?>
					<span class="customize-control-description"><?php echo esc_html( $this->description ); ?></span>
				<?php } ?>
				<input type="hidden" id="<?php echo esc_attr( $this->id ); ?>" name="<?php echo esc_attr( $this->id ); ?>" value="<?php echo esc_attr( $this->value() ); ?>" class="customize-control-sortable-pill-checkbox" <?php $this->link(); ?> />
				<div class="sortable_pills<?php echo esc_attr( $this->sortable ? ' sortable' : '' ) . ( $this->fullwidth ? ' fullwidth_pills' : '' ); ?>">
				<?php foreach ( $reordered_choices as $key => $value ) { ?>
					<label class="checkbox-label">
						<input type="checkbox" name="<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( $key ); ?>" <?php checked( in_array( esc_attr( $key ), $saved_choices, true ), true ); ?> class="sortable-pill-checkbox"/>
						<span class="sortable-pill-title"><?php echo esc_html( $value ); ?></span>
						<?php if( $this->sortable && $this->fullwidth ) { ?>
							<span class="dashicons dashicons-sort"></span>
						<?php } ?>
					</label>
				<?php } ?>
				</div>
			</div>
		<?php
		}
	}

	/**
	 * Divider Custom Control
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 */
	class Skyrocket_Divider_Custom_Control extends Skyrocket_Custom_Control {
		/**
		 * The type of control being rendered
		 */
		public $type = 'simple_divider';
		/**
		 * Define the available widths for the divider
		 */
		private $available_divider_widths = array( "default", "full", "half" );
		/**
		 * Define the available types of divider
		 */
		private $available_divider_types = array( "solid", "dashed", "dotted", "double" );
		/**
		 * Define the width of the divider. Either 'default', 'full', or 'half'. Default = 'default'
		 */
		private $dividerwidth = 'default';
		/**
		 * Define the type of divider line. Either 'solid', 'dashed' or 'dotted'. Default = 'solid'
		 */
		private $dividertype = 'solid';
		/**
		 * Define size of the top margin in px. Default = 20
		 */
		private $margintop = 20;
		/**
		 * Define size of the top margin in px. Default = 20
		 */
		private $marginbottom = 20;
		/**
		 * Constructor
		 */
		public function __construct( $manager, $id, $args = array(), $options = array() ) {
			parent::__construct( $manager, $id, $args );
			// Check the width of the divider
			if ( isset( $this->input_attrs['width'] ) ) {
				if ( in_array( strtolower( $this->input_attrs['width'] ), $this->available_divider_widths, true ) ) {
					$this->dividerwidth = strtolower( $this->input_attrs['width'] );
				}
			}
			// Check the type of divider
			if ( isset( $this->input_attrs['type'] ) ) {
				if ( in_array( strtolower( $this->input_attrs['type'] ), $this->available_divider_types, true ) ) {
					$this->dividertype = strtolower( $this->input_attrs['type'] );
				}
			}
			// Check if the top margin is specified and valid. Will accept int and string values. i.e. 42 or '42'
			if ( isset( $this->input_attrs['margintop'] ) &&  is_numeric( $this->input_attrs['margintop'] ) ) {
				$this->margintop = abs( (int)$this->input_attrs['margintop'] );
			}
			// Check if the bottom margin is specified and valid. Will accept int and string values. i.e. 42 or '42'
			if ( isset( $this->input_attrs['marginbottom'] ) &&  is_numeric( $this->input_attrs['marginbottom'] ) ) {
				$this->marginbottom = abs( (int)$this->input_attrs['marginbottom'] );
			}
		}
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the control in the customizer
		 */
		public function render_content() {
		?>
			<div class="simple-divider-custom-control simple-divider-type-<?php echo esc_html($this->dividertype); ?> simple-divider-width-<?php echo esc_html($this->dividerwidth); ?>" style="margin-top:<?php echo esc_html($this->margintop); ?>px;margin-bottom:<?php echo esc_html($this->marginbottom); ?>px"></div>
		<?php
		}
	}

	/**
	 * Upsell section
	 *
	 * @author Anthony Hortin <http://maddisondesigns.com>
	 * @license http://www.gnu.org/licenses/gpl-2.0.html
	 * @link https://github.com/maddisondesigns
	 *
	 */
	class Skyrocket_Upsell_Section extends Skyrocket_Custom_Section {
		/**
		 * The type of control being rendered
		 */
		public $type = 'skyrocket-upsell';
		/**
		 * The Upsell URL
		 */
		public $url = '';
		/**
		 * The background color for the control
		 */
		public $backgroundcolor = '';
		/**
		 * The text color for the control
		 */
		public $textcolor = '';
		/**
		 * Enqueue our scripts and styles
		 */
		public function enqueue() {
			wp_enqueue_script( 'skyrocket-custom-controls-js', $this->get_skyrocket_resource_url() . 'js/customizer.js', array( 'jquery' ), $this->skyrocketCustomControlsJsVersion, true );
			wp_enqueue_style( 'skyrocket-custom-controls-css', $this->get_skyrocket_resource_url() . 'css/customizer.css', array(), $this->skyrocketCustomControlsCssVersion, 'all' );
		}
		/**
		 * Render the section, and the controls that have been added to it.
		 */
		protected function render() {
			$bkgrndcolor = !empty( $this->backgroundcolor ) ? esc_attr( $this->backgroundcolor ) : '#fff';
			$color = !empty( $this->textcolor ) ? esc_attr( $this->textcolor ) : '#555d66';
			?>
			<li id="accordion-section-<?php echo esc_attr( $this->id ); ?>" class="skyrocket_upsell_section accordion-section control-section control-section-<?php echo esc_attr( $this->id ); ?> cannot-expand">
				<h3 class="upsell-section-title" <?php echo ' style="color:' . $color . ';border-left-color:' . $bkgrndcolor .';border-right-color:' . $bkgrndcolor .';"'; ?>>
					<a href="<?php echo esc_url( $this->url); ?>" target="_blank"<?php echo ' style="background-color:' . $bkgrndcolor . ';color:' . $color .';"'; ?>><?php echo esc_html( $this->title ); ?></a>
				</h3>
			</li>
			<?php
		}
	}

	/**
	 * URL sanitization
	 *
	 * @param  string	Input to be sanitized (either a string containing a single url or multiple, separated by commas)
	 * @return string	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_url_sanitization' ) ) {
		function skyrocket_url_sanitization( $input ) {
			if ( strpos( $input, ',' ) !== false) {
				$input = explode( ',', $input );
			}
			if ( is_array( $input ) ) {
				foreach ($input as $key => $value) {
					$input[$key] = esc_url_raw( $value );
				}
				$input = implode( ',', $input );
			}
			else {
				$input = esc_url_raw( $input );
			}
			return $input;
		}
	}

	/**
	 * Switch sanitization
	 *
	 * @param  string		Switch value
	 * @return integer	Sanitized value
	 */
	if ( ! function_exists( 'skyrocket_switch_sanitization' ) ) {
		function skyrocket_switch_sanitization( $input ) {
			if ( true === $input ) {
				return 1;
			} else {
				return 0;
			}
		}
	}

	/**
	 * Radio Button and Select sanitization
	 *
	 * @param  string		Radio Button value
	 * @return integer	Sanitized value
	 */
	if ( ! function_exists( 'skyrocket_radio_sanitization' ) ) {
		function skyrocket_radio_sanitization( $input, $setting ) {
			//get the list of possible radio box or select options
		 $choices = $setting->manager->get_control( $setting->id )->choices;

			if ( array_key_exists( $input, $choices ) ) {
				return $input;
			} else {
				return $setting->default;
			}
		}
	}

	/**
	 * Integer sanitization
	 *
	 * @param  string		Input value to check
	 * @return integer	Returned integer value
	 */
	if ( ! function_exists( 'skyrocket_sanitize_integer' ) ) {
		function skyrocket_sanitize_integer( $input ) {
			return (int) $input;
		}
	}

	/**
	 * Text sanitization
	 *
	 * @param  string	Input to be sanitized (either a string containing a single string or multiple, separated by commas)
	 * @return string	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_text_sanitization' ) ) {
		function skyrocket_text_sanitization( $input ) {
			if ( strpos( $input, ',' ) !== false) {
				$input = explode( ',', $input );
			}
			if( is_array( $input ) ) {
				foreach ( $input as $key => $value ) {
					$input[$key] = sanitize_text_field( $value );
				}
				$input = implode( ',', $input );
			}
			else {
				$input = sanitize_text_field( $input );
			}
			return $input;
		}
	}

	/**
	 * Array sanitization
	 *
	 * @param  array	Input to be sanitized
	 * @return array	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_array_sanitization' ) ) {
		function skyrocket_array_sanitization( $input ) {
			if( is_array( $input ) ) {
				foreach ( $input as $key => $value ) {
					$input[$key] = sanitize_text_field( $value );
				}
			}
			else {
				$input = '';
			}
			return $input;
		}
	}

	/**
	 * Alpha Color (Hex, RGB & RGBa) sanitization
	 *
	 * @param  string	Input to be sanitized
	 * @return string	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_hex_rgba_sanitization' ) ) {
		function skyrocket_hex_rgba_sanitization( $input, $setting ) {
			if ( empty( $input ) || is_array( $input ) ) {
				return $setting->default;
			}

			if ( false === strpos( $input, 'rgb' ) ) {
				// If string doesn't start with 'rgb' then santize as hex color
				$input = sanitize_hex_color( $input );
			} else {
				if ( false === strpos( $input, 'rgba' ) ) {
					// Sanitize as RGB color
					$input = str_replace( ' ', '', $input );
					sscanf( $input, 'rgb(%d,%d,%d)', $red, $green, $blue );
					$input = 'rgb(' . skyrocket_in_range( $red, 0, 255 ) . ',' . skyrocket_in_range( $green, 0, 255 ) . ',' . skyrocket_in_range( $blue, 0, 255 ) . ')';
				}
				else {
					// Sanitize as RGBa color
					$input = str_replace( ' ', '', $input );
					sscanf( $input, 'rgba(%d,%d,%d,%f)', $red, $green, $blue, $alpha );
					$input = 'rgba(' . skyrocket_in_range( $red, 0, 255 ) . ',' . skyrocket_in_range( $green, 0, 255 ) . ',' . skyrocket_in_range( $blue, 0, 255 ) . ',' . skyrocket_in_range( $alpha, 0, 1 ) . ')';
				}
			}
			return $input;
		}
	}

	/**
	 * Only allow values between a certain minimum & maxmium range
	 *
	 * @param  number	Input to be sanitized
	 * @return number	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_in_range' ) ) {
		function skyrocket_in_range( $input, $min, $max ){
			if ( $input < $min ) {
				$input = $min;
			}
			if ( $input > $max ) {
				$input = $max;
			}
			return $input;
		}
	}

	/**
	 * Google Font sanitization
	 *
	 * @param  string	JSON string to be sanitized
	 * @return string	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_google_font_sanitization' ) ) {
		function skyrocket_google_font_sanitization( $input ) {
			$val =  json_decode( $input, true );
			if( is_array( $val ) ) {
				foreach ( $val as $key => $value ) {
					$val[$key] = sanitize_text_field( $value );
				}
				$input = json_encode( $val );
			}
			else {
				$input = json_encode( sanitize_text_field( $val ) );
			}
			return $input;
		}
	}

	/**
	 * Date Time sanitization
	 *
	 * @param  string	Date/Time string to be sanitized
	 * @return string	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_date_time_sanitization' ) ) {
		function skyrocket_date_time_sanitization( $input, $setting ) {
			$datetimeformat = 'Y-m-d';
			if ( $setting->manager->get_control( $setting->id )->include_time ) {
				$datetimeformat = 'Y-m-d H:i:s';
			}
			$date = DateTime::createFromFormat( $datetimeformat, $input );
			if ( $date === false ) {
				$date = DateTime::createFromFormat( $datetimeformat, $setting->default );
			}
			return $date->format( $datetimeformat );
		}
	}

	/**
	 * Slider sanitization
	 *
	 * @param  string	Slider value to be sanitized
	 * @return string	Sanitized input
	 */
	if ( ! function_exists( 'skyrocket_range_sanitization' ) ) {
		function skyrocket_range_sanitization( $input, $setting ) {
			$attrs = $setting->manager->get_control( $setting->id )->input_attrs;

			$min = ( isset( $attrs['min'] ) ? $attrs['min'] : $input );
			$max = ( isset( $attrs['max'] ) ? $attrs['max'] : $input );
			$step = ( isset( $attrs['step'] ) ? $attrs['step'] : 1 );

			$number = floor( $input / $attrs['step'] ) * $attrs['step'];

			return skyrocket_in_range( $number, $min, $max );
		}
	}

}
