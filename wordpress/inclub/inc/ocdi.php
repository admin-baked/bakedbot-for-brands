<?php 
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action('admin_head', 'inclub_admin_head');
function inclub_admin_head() {
  echo '<style>
    .ocdi-install-plugins-content-content,
.ocdi-install-plugins-content-header,
.ocdi-imported-footer a:first-of-type
{
		    display: none;
	}
  </style>';
}

function inclub_ocdi_before_content_import( $selected_import ) {
	update_option( 'elementor_experiment-e_font_icon_svg', 'inactive' );
	update_option( 'elementor_experiment-nested-elements', 'active' );
	update_option( 'elementor_experiment-e_optimized_markup', 'inactive' );
	update_option( 'elementor_experiment-e_lazyload', 'inactive' );
	update_option( 'elementor_experiment-e_element_cache', 'inactive' );
	update_option( 'elementor_element_cache_ttl', 'disable' );
	update_option( 'elementor_local_google_fonts', '0' );
	update_option( 'elementor_unfiltered_files_upload', '1' );
}
add_action( 'ocdi/before_content_import', 'inclub_ocdi_before_content_import' );

function inclub_ocdi_plugin_intro_text( $default_text ) {
    $default_text = '<div class="ocdi__intro-text"><p>'.esc_html__( 'Importing demo data (post, pages, images, theme settings, etc.) is the quickest and easiest way to set up your new theme. It allows you to simply edit everything instead of creating content and layouts from scratch.', 'inclub' ).'</p></div>';
 
    return $default_text;
}
add_filter( 'ocdi/plugin_intro_text', 'inclub_ocdi_plugin_intro_text' );

function inclub_ocdi_import_files() {
  return array(
    array(
      'import_file_name'           => 'Demo',
      'import_file_url'            => 'https://cdn.awaikenthemes.com/demo-content/inclub/inclub.xml',
      'import_customizer_file_url' => 'https://cdn.awaikenthemes.com/demo-content/inclub/inclub.dat',
	  'import_preview_image_url'   => 'https://demo.awaikenthemes.com/inclub/assets/demo.jpg',
      'preview_url'                => 'https://demo.awaikenthemes.com/inclub/',
    )
  );
}
add_filter( 'ocdi/import_files', 'inclub_ocdi_import_files' );


function inclub_ocdi_after_import_setup() {
	global $wpdb;
	// Assign menus to their locations.
	$header_menu = get_term_by( 'name', 'Header Menu', 'nav_menu' );
	$footer_menu = get_term_by( 'name', 'Footer Menu', 'nav_menu' );
	$old_url = 'https://demo.awaikenthemes.com/inclub';
	update_option( 'inclub_demo_imported', 1, 'no' );
	
	if( isset($header_menu->term_id) ){
		set_theme_mod( 'nav_menu_locations', array(
				'header' => $header_menu->term_id,
			)
		);
	}
	
	if( isset($footer_menu->term_id) ){
		set_theme_mod( 'nav_menu_locations', array(
				'footer' => $footer_menu->term_id
			)
		);
	}
	
	 // Get the front page.
	  $front_page = get_posts(
		[
		  'post_type'              => 'page',
		  'title'                  => 'Home',
		  'post_status'            => 'all',
		  'numberposts'            => 1,
		  'update_post_term_cache' => false,
		  'update_post_meta_cache' => false,
		]
	  );
	 
	  if ( ! empty( $front_page ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $front_page[0]->ID );
	  }
	  
	  // Get the blog page.
	  $blog_page = get_posts(
		[
		  'post_type'              => 'page',
		  'title'                  => 'Blog',
		  'post_status'            => 'all',
		  'numberposts'            => 1,
		  'update_post_term_cache' => false,
		  'update_post_meta_cache' => false,
		]
	  );
	
	 if ( ! empty( $blog_page ) ) {
		update_option( 'page_for_posts', $blog_page[0]->ID );
	  }
	
	
	  // Get elementor Kit.
	  $kit_page = get_posts(
		[
		  'post_type'              => 'elementor_library',
		  'title'                  => 'Inclub - Default Kit',
		  'post_status'            => 'all',
		  'numberposts'            => 1,
		  'update_post_term_cache' => false,
		  'update_post_meta_cache' => false,
		]
	  );
	
	if ( ! empty( $kit_page ) ) {
		update_option( 'elementor_active_kit', $kit_page[0]->ID );
	}
	  
	// Get the current site's home URL without trailing slash
	$new_url = untrailingslashit( home_url() );


	// Replace in _elementor_data (postmeta)
	$escaped_from = str_replace( '/', '\\/', $old_url );
	$escaped_to = str_replace( '/', '\\/', $new_url );
	$meta_value_like = '[%'; // meta_value LIKE '[%' are json formatted

	$rows_affected = $wpdb->query(
		$wpdb->prepare(
			"UPDATE {$wpdb->postmeta} " .
			'SET `meta_value` = REPLACE(`meta_value`, %s, %s) ' .
			"WHERE `meta_key` = '_elementor_data' AND `meta_value` LIKE %s;",
			$escaped_from,
			$escaped_to,
			$meta_value_like
		)
	);

	// Replace in custom menu item links (with and without trailing slash)
	$menu_items = get_posts( array(
		'post_type'      => 'nav_menu_item',
		'posts_per_page' => -1,
		'post_status'    => 'any',
		'fields'         => 'ids',
	) );

	if ( ! empty( $menu_items ) && is_array( $menu_items ) ) {
		foreach ( $menu_items as $menu_item_id ) {

			// Get the current custom URL from menu item
			$url = get_post_meta( $menu_item_id, '_menu_item_url', true );

			// Skip if no URL or it's not a valid string
			if ( empty( $url ) || ! is_string( $url ) ) {
				continue;
			}

			// Replace old URL	 with new one (handling both with and without trailing slash)
			$new_link = str_replace(
				array( untrailingslashit( $old_url ), trailingslashit( $old_url ) ),
				array( untrailingslashit( $new_url ), trailingslashit( $new_url ) ),
				$url
			);

			// Only update if something changed
			if ( $new_link !== $url ) {
				update_post_meta( $menu_item_id, '_menu_item_url', esc_url_raw( $new_link ) );
			}
		}
	}

	// Check if Elementor is active
    if ( did_action( 'elementor/loaded' ) ) {
        // Regenerate CSS files
        \Elementor\Plugin::instance()->files_manager->clear_cache();
    }

}
add_action( 'ocdi/after_import', 'inclub_ocdi_after_import_setup' );