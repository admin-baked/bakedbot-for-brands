<?php 
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

function inclub_admin_css() {
	wp_enqueue_style( 'theme-default-font-admin', inclub_slug_fonts_url(), array(), null );
	wp_enqueue_style( 'inclub-admin', INCLUB_THEME_URL . '/assets/css/admin.css', array(), INCLUB_THEME_VERSION );
	$documentation_link = apply_filters('inclub_documentation_link', true);

    if ($documentation_link) {
		wp_enqueue_script( 'admin-theme-js', INCLUB_THEME_URL . '/assets/js/admin.js', array( 'jquery' ), INCLUB_THEME_VERSION, true );    
    }	
}

// Hook the custom_admin_css function to the admin_enqueue_scripts action.
add_action('admin_enqueue_scripts', 'inclub_admin_css', 11);

add_action('admin_menu', 'inclub_custom_appearance_submenu');

function inclub_custom_appearance_submenu() {
	
    $documentation_link = apply_filters('inclub_documentation_link', true);

    if (!$documentation_link) {
        return;
    }
	
    add_submenu_page(
        'themes.php', 
        __( 'Documentation', 'inclub' ), 
        __( 'Documentation', 'inclub' ), 
        'manage_options', 
        'custom_documentation_link', 
        '__return_null' 
    );
}