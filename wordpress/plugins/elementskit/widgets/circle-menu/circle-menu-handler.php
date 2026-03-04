<?php
namespace Elementor;

class ElementsKit_Widget_Circle_Menu_Handler extends \ElementsKit_Lite\Core\Handler_Widget {

    static function get_name() {
        return 'elementskit-circle-menu';
    }

    static function get_title() {
        return esc_html__( 'Circle Menu', 'elementskit' );
    }

    static function get_icon() {
        return 'ekit ekit-widget-icon ekit-coupon-code';
    }

    static function get_categories() {
        return [ 'elementskit' ];
    }

    static function get_dir() {
        return \ElementsKit::widget_dir() . 'circle-menu/';
    }

    static function get_url() {
        return \ElementsKit::widget_url() . 'circle-menu/';
    }

	public function scripts(){
		wp_register_script( 'circle-menu', self::get_url() . 'assets/js/circle-menu.min.js', array( 'jquery' ), \ElementsKit_Lite::version(), true );
	}
}