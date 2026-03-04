<?php 
/*
Plugin Name:  Inclub Theme Addons
Plugin URI:   https://awaikenthemes.com
Description:  This plugin is intended for use with the inclub theme.
Version:      1.0.0
Author:       Awaiken Technology
Author URI:   https://awaiken.com
License:      GPL2
License URI:  https://www.gnu.org/licenses/gpl-2.0.html
Text Domain:  inclub-theme-addons
Domain Path:  /languages
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

define( 'INCLUB_ADDONS_URL', plugins_url( '/', __FILE__ ) );
define( 'INCLUB_ADDONS_PATH', plugin_dir_path( __FILE__ ) );


// Load translation.
add_action( 'init', 'inclub_i18n' );

/**
 * Load the plugin text domain for translation.
 *
 * @since    1.0.0
 */
function inclub_i18n() {
	load_plugin_textdomain( 'inclub-theme-addons' );
}

/* Allow SVG upload */
add_filter( 'wp_check_filetype_and_ext', function( $data, $file, $filename, $mimes ) {

  $filetype = wp_check_filetype( $filename, $mimes );

  return [
      'ext' => $filetype['ext'],
      'type' => $filetype['type'],
      'proper_filename' => $data['proper_filename']
  ];

}, 10, 4 );

function inclub_allow_svg_upload( $mimes ) {
  $mimes['svg'] = 'image/svg+xml';
  $mimes['svgz'] = 'image/svg+xml';
  return $mimes;
}
add_filter( 'upload_mimes', 'inclub_allow_svg_upload' );

require INCLUB_ADDONS_PATH . 'includes/secondary-image.php';

/*
* Project CPT
*/
if(!class_exists('Awaiken_Project')) { 
	class Awaiken_Project {

		const PROJECT_CPT_SLUG = 'awaiken-project';
		const PROJECT_CATEGORY_SLUG = 'awaiken-project-category';

		public function register_data() {

			$labels = [
				'name' => esc_html_x( 'Projects', 'Projects', 'inclub-theme-addons' ),
				'singular_name' => esc_html_x( 'Project', 'Project', 'inclub-theme-addons' ),
				'menu_name' => esc_html_x( 'Projects', 'Projects', 'inclub-theme-addons' ),
				'name_admin_bar' => esc_html__( 'Project Item', 'inclub-theme-addons' ),
				'archives' => esc_html__( 'Project Item Archives', 'inclub-theme-addons' ),
				'parent_item_colon' => esc_html__( 'Parent Item:', 'inclub-theme-addons' ),
				'all_items' => esc_html__( 'All Items', 'inclub-theme-addons' ),
				'add_new_item' => esc_html__( 'Add New Project', 'inclub-theme-addons' ),
				'add_new' => esc_html__( 'Add New', 'inclub-theme-addons' ),
				'new_item' => esc_html__( 'New Project', 'inclub-theme-addons' ),
				'edit_item' => esc_html__( 'Edit Project', 'inclub-theme-addons' ),
				'update_item' => esc_html__( 'Update Project', 'inclub-theme-addons' ),
				'view_item' => esc_html__( 'View Project', 'inclub-theme-addons' ),
				'search_items' => esc_html__( 'Search Projects', 'inclub-theme-addons' ),
				'not_found' => esc_html__( 'Not found', 'inclub-theme-addons' ),
				'not_found_in_trash' => esc_html__( 'Not found in Trash', 'inclub-theme-addons' ),
				'featured_image' => esc_html__( 'Featured Image', 'inclub-theme-addons' ),
				'set_featured_image' => esc_html__( 'Set featured image', 'inclub-theme-addons' ),
				'remove_featured_image' => esc_html__( 'Remove featured image', 'inclub-theme-addons' ),
				'use_featured_image' => esc_html__( 'Use as featured image', 'inclub-theme-addons' ),
				'insert_into_item' => esc_html__( 'Insert into Project', 'inclub-theme-addons' ),
				'uploaded_to_this_item' => esc_html__( 'Uploaded to this Project', 'inclub-theme-addons' ),
				'items_list' => esc_html__( 'Items list', 'inclub-theme-addons' ),
				'items_list_navigation' => esc_html__( 'Items list navigation', 'inclub-theme-addons' ),
				'filter_items_list' => esc_html__( 'Filter items list', 'inclub-theme-addons' ),
			];

			$project_slug = apply_filters( 'awaiken_project_slug', 'projects' );

			$rewrite = [
				'slug' => $project_slug,
				'with_front' => false,
			];

			$args = [
				'labels' => $labels,
				'public' => true,
				'menu_position' => 25,
				'menu_icon' => 'dashicons-format-image',
				'capability_type' => 'post',
				'supports' => [ 'title', 'editor', 'thumbnail', 'author', 'excerpt', 'comments', 'revisions', 'page-attributes', 'custom-fields', 'elementor' ],
				'has_archive' => true,
				'rewrite' => $rewrite,
			];

			register_post_type( self::PROJECT_CPT_SLUG, $args );

			// Categories
			$project_category_slug = apply_filters( 'awaiken_project_category_slug', 'project-category' );

			$rewrite = [
				'slug' => $project_category_slug,
				'with_front' => false,
			];

			$args = [
				'hierarchical' => true,
				'show_ui' => true,
				'show_in_nav_menus' => false,
				'show_admin_column' => true,
				'labels' => $labels,
				'rewrite' => $rewrite,
				'public' => true,
				'labels' => [
					'name' => esc_html_x( 'Categories', 'Project', 'inclub-theme-addons' ),
					'singular_name' => esc_html_x( 'Category', 'Project', 'inclub-theme-addons' ),
					'all_items' => esc_html_x( 'All Categories', 'Project', 'inclub-theme-addons' ),
				],
			];
			register_taxonomy( self::PROJECT_CATEGORY_SLUG, self::PROJECT_CPT_SLUG, $args );
		}

		public function __construct() {
			add_action( 'init', [ $this, 'register_data' ], 1 );
		}
	}
	/**
	 * initialize 
	 */
	$Awaiken_Project = new Awaiken_Project();
}