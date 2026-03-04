<?php 
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
*	Register action
*/
add_action( 'inclub_action_get_breadcrumb', 'inclub_get_breadcrumb' );
add_action( 'inclub_action_social_sharing', 'inclub_get_social_sharing_icons' );

function inclub_get_social_sharing_icons() {
	$sharing_links = inclub_generate_social_share_links();
	if($sharing_links) {
		echo '<div class="post-social-sharing">';
		echo wp_kses_post($sharing_links);
		echo '</div>';
	}
}


/*
 * Add class to body
*/
add_filter( 'body_class', 'inclub_body_class' );
function inclub_body_class( $classes ) {
	global $INCLUB_STORAGE;
	
    if( get_theme_mod( 'magic_cursor', $INCLUB_STORAGE['magic_cursor'] ) ) { 
        $classes[] = 'tt-magic-cursor';
    }

	if( !get_theme_mod( 'show_small_heading_icon', $INCLUB_STORAGE['show_small_heading_icon'] ) ) { 
        $classes[] = 'inclub-hide-small-icon';
    }
	
	if( isset($_GET['elementskit_template']) && !isset($_GET['elementor-preview']) && ( in_array($_GET['elementskit_template'], array( 'header', 'header-layout-2', 'header-layout-3', 'header-layout-4') ) ) ) {
		$classes[] = 'inclub-header-preview';
	}
	
    return $classes;
}

add_action( 'wp_body_open', 'inclub_wp_body_open' );

function inclub_wp_body_open() {
	global $INCLUB_STORAGE;

	if( !is_admin() && get_theme_mod( 'show_preloader', $INCLUB_STORAGE['show_preloader'] ) ) { 
	
	$icon = get_theme_mod( 'preloader_icon', $INCLUB_STORAGE['preloader_icon'] );
	$preloader_icon = INCLUB_THEME_URL.'/assets/images/loader.svg';
	if ( !empty($icon) ) { 
		$preloader_icon = wp_get_attachment_image_src( $icon , 'full' );
		$preloader_icon = $preloader_icon[0];
	}
	?>
	<div class="preloader">
		<div class="loading-container">
			<div class="loading"></div>
			<div id="loading-icon"><img src="<?php echo esc_url($preloader_icon); ?>" alt="<?php echo esc_attr__( 'Preloader', 'inclub' ); ?>"></div>
		</div>
	</div>
	<?php 
	} 
	if( get_theme_mod( 'magic_cursor', $INCLUB_STORAGE['magic_cursor'] ) ) { 
	?>
	<div id="magic-cursor">
		<div id="ball"></div>
	</div>
	<?php 
	}
}


/*
* Add class to header menu li tag
*/

function inclub_add_additional_class_on_li($classes, $item, $args) {
	if (property_exists($args, 'li_class')) {
        $classes[] = $args->li_class;
    }
    return $classes;
}
add_filter('nav_menu_css_class', 'inclub_add_additional_class_on_li', 1, 3);

/*
* Add class to header menu li a tag
*/

function inclub_add_additional_class_to_a( $atts, $item, $args ) {
  if (property_exists($args, 'a_tag_class')) {
    $atts['class'] = $args->a_tag_class;
  }
  return $atts;
}
add_filter( 'nav_menu_link_attributes', 'inclub_add_additional_class_to_a', 1, 3 );


/**
* Menu fallback
*/

function inclub_fallback( $args ) {
	if ( ! current_user_can( 'edit_theme_options' ) ) {
		return;
	}

	// Initialize var to store fallback html.
	$fallback_output = '';

	// Menu container opening tag.
	$show_container = false;
	if ( $args['container'] ) {
		/**
		 * Filters the list of HTML tags that are valid for use as menu containers.
		 *
		 * @since WP 3.0.0
		 *
		 * @param array $tags The acceptable HTML tags for use as menu containers.
		 *                    Default is array containing 'div' and 'nav'.
		 */
		$allowed_tags = apply_filters( 'wp_nav_menu_container_allowedtags', array( 'div', 'nav' ) );
		if ( is_string( $args['container'] ) && in_array( $args['container'], $allowed_tags, true ) ) {
			$show_container   = true;
			$class            = $args['container_class'] ? ' class="menu-fallback-container ' . esc_attr( $args['container_class'] ) . '"' : ' class="menu-fallback-container"';
			$id               = $args['container_id'] ? ' id="' . esc_attr( $args['container_id'] ) . '"' : '';
			$fallback_output .= '<' . $args['container'] . $id . $class . '>';
		}
	}

	// The fallback menu.
	$class            = $args['menu_class'] ? ' class="menu-fallback-menu ' . esc_attr( $args['menu_class'] ) . '"' : ' class="menu-fallback-menu"';
	$id               = $args['menu_id'] ? ' id="' . esc_attr( $args['menu_id'] ) . '"' : '';
	$fallback_output .= '<ul' . $id . $class . '>';
	$fallback_output .= '<li class="nav-item"><a href="' . esc_url( admin_url( 'nav-menus.php' ) ) . '" class="nav-link" title="' . esc_attr__( 'Add a menu', 'inclub' ) . '">' . esc_html__( 'Add a menu', 'inclub' ) . '</a></li>';
	$fallback_output .= '</ul>';

	// Menu container closing tag.
	if ( $show_container ) {
		$fallback_output .= '</' . $args['container'] . '>';
	}

	// if $args has 'echo' key and it's true echo, otherwise return.
	if ( array_key_exists( 'echo', $args ) && $args['echo'] ) {
		echo wp_kses_post( $fallback_output );
	} else {
		return $fallback_output;
	}
}

function inclub_license_valid() {
	
	$license = trim( get_option( AWAIKEN_THEME_SLUG . '_license_key' ) );
	if ( empty($license) ){  return false; }
	
	$status  = get_option( AWAIKEN_THEME_SLUG . '_license_key_status', false );
	if ( 'valid' !== $status ) { return false; }
	
	return true;
	
}


/**
 * Archive page title
 */

if ( ! function_exists( 'inclub_get_archive_title' ) ) {
	function inclub_get_archive_title() {

		if ( is_front_page() ) {
			$title = esc_html__( 'Home', 'inclub' );
		} elseif ( is_home() ) {
			$title = get_theme_mod( 'blog_page_title' );
			if(empty($title)) {
				$title = esc_html__( 'Blog', 'inclub' );
			}
		} elseif ( is_author() ) {
			$curauth = ( get_query_var( 'author_name' ) ) ? get_user_by( 'slug', get_query_var( 'author_name' ) ) : get_userdata( get_query_var( 'author' ) );
			// Translators: Add the author's name to the title
			$title = sprintf( esc_html__( 'Author: %s', 'inclub' ), $curauth->display_name );
		} elseif ( is_404() ) {
			$title = esc_html__( 'URL not found', 'inclub' );
		} elseif ( is_search() ) {
			// Translators: Add the author's name to the title
			$title = sprintf( esc_html__( 'Search: %s', 'inclub' ), get_search_query() );
		} elseif ( is_day() ) {
			// Translators: Add the queried date to the title
			$title = sprintf( esc_html__( 'Daily Archives: %s', 'inclub' ), get_the_date() );
		} elseif ( is_month() ) {
			// Translators: Add the queried month to the title
			$title = sprintf( esc_html__( 'Monthly Archives: %s', 'inclub' ), get_the_date( 'F Y' ) );
		} elseif ( is_year() ) {
			// Translators: Add the queried year to the title
			$title = sprintf( esc_html__( 'Yearly Archives: %s', 'inclub' ), get_the_date( 'Y' ) );
		} elseif ( is_category() ) {
			$title = single_cat_title( '', false );
		} elseif ( is_tag() ) {
			// Translators: Add the tag's name to the title
			$title = sprintf( esc_html__( 'Tag: %s', 'inclub' ), single_tag_title( '', false ) );
		} elseif ( is_tax() ) {
			$title = single_term_title( '', false );
		}
		elseif ( is_post_type_archive('awaiken-project') ) {
			$title = get_theme_mod( 'project_page_title' );
			if(empty($title)) {
				$title = esc_html__( 'Our Projects', 'inclub' );
			}
		}
		elseif ( is_post_type_archive() ) {
			$obj   = get_queried_object();
			$title = ! empty( $obj->labels->all_items ) ? $obj->labels->all_items : '';
		} elseif ( is_attachment() ) {
			// Translators: Add the attachment's name to the title
			$title = sprintf( esc_html__( 'Attachment: %s', 'inclub' ), get_the_title() );
		} elseif ( is_single() || is_page() ) {
			$title = get_the_title();
		} else {
			$title = get_the_title();
		}
		return apply_filters( 'inclub_filter_get_archive_title', $title );
	}
}

/**
 * Set our Social Icons URLs.
 */
if ( ! function_exists( 'inclub_social_icons_list' ) ) {
	function inclub_social_icons_list() {

		$social_icons = array(
			array( 'url' => '500px.com', 'icon' => 'fab fa-500px', 'class' => 'fivehundredpx' ),
			array( 'url' => 'artstation.com', 'icon' => 'fab fa-artstation', 'class' => 'artstation' ),
			array( 'url' => 'behance.net', 'icon' => 'fab fa-behance', 'class' => 'behance' ),
			array( 'url' => 'bitbucket.org', 'icon' => 'fab fa-bitbucket', 'class' => 'bitbucket' ),
			array( 'url' => 'codepen.io', 'icon' => 'fab fa-codepen', 'class' => 'codepen' ),
			array( 'url' => 'deviantart.com', 'icon' => 'fab fa-deviantart', 'class' => 'deviantart' ),
			array( 'url' => 'discord.gg', 'icon' => 'fab fa-discord', 'class' => 'discord' ),
			array( 'url' => 'dribbble.com', 'icon' => 'fab fa-dribbble', 'class' => 'dribbble' ),
			array( 'url' => 'etsy.com', 'icon' => 'fab fa-etsy', 'class' => 'etsy' ),
			array( 'url' => 'facebook.com', 'icon' => 'fab fa-facebook-f', 'class' => 'facebook' ),
			array( 'url' => 'figma.com', 'icon' => 'fab fa-figma', 'class' => 'figma' ),
			array( 'url' => 'flickr.com', 'icon' => 'fab fa-flickr', 'class' => 'flickr' ),
			array( 'url' => 'foursquare.com', 'icon' => 'fab fa-foursquare', 'class' => 'foursquare' ),
			array( 'url' => 'github.com', 'icon' => 'fab fa-github', 'class' => 'github' ),
			array( 'url' => 'instagram.com', 'icon' => 'fab fa-instagram', 'class' => 'instagram' ),
			array( 'url' => 'kickstarter.com', 'icon' => 'fab fa-kickstarter-k', 'class' => 'kickstarter' ),
			array( 'url' => 'last.fm', 'icon' => 'fab fa-lastfm', 'class' => 'lastfm' ),
			array( 'url' => 'linkedin.com', 'icon' => 'fab fa-linkedin-in', 'class' => 'linkedin' ),
			array( 'url' => 'mastodon.social', 'icon' => 'fab fa-mastodon', 'class' => 'mastodon' ),
			array( 'url' => 'mastodon.art', 'icon' => 'fab fa-mastodon', 'class' => 'mastodon' ),
			array( 'url' => 'medium.com', 'icon' => 'fab fa-medium-m', 'class' => 'medium' ),
			array( 'url' => 'patreon.com', 'icon' => 'fab fa-patreon', 'class' => 'patreon' ),
			array( 'url' => 'pinterest.com', 'icon' => 'fab fa-pinterest-p', 'class' => 'pinterest' ),
			array( 'url' => 'quora.com', 'icon' => 'fab fa-quora', 'class' => 'Quora' ),
			array( 'url' => 'reddit.com', 'icon' => 'fab fa-reddit-alien', 'class' => 'reddit' ),
			array( 'url' => 'slack.com', 'icon' => 'fab fa-slack-hash', 'class' => 'slack.' ),
			array( 'url' => 'slideshare.net', 'icon' => 'fab fa-slideshare', 'class' => 'slideshare' ),
			array( 'url' => 'snapchat.com', 'icon' => 'fab fa-snapchat-ghost', 'class' => 'snapchat' ),
			array( 'url' => 'soundcloud.com', 'icon' => 'fab fa-soundcloud', 'class' => 'soundcloud' ),
			array( 'url' => 'spotify.com', 'icon' => 'fab fa-spotify', 'class' => 'spotify' ),
			array( 'url' => 'stackoverflow.com', 'icon' => 'fab fa-stack-overflow', 'class' => 'stackoverflow' ),
			array( 'url' => 'steamcommunity.com', 'icon' => 'fab fa-steam', 'class' => 'steam' ),
			array( 'url' => 't.me', 'icon' => 'fab fa-telegram', 'class' => 'Telegram' ),
			array( 'url' => 'tiktok.com', 'icon' => 'fab fa-tiktok', 'class' => 'tiktok' ),
			array( 'url' => 'tumblr.com', 'icon' => 'fab fa-tumblr', 'class' => 'tumblr' ),
			array( 'url' => 'twitch.tv', 'icon' => 'fab fa-twitch', 'class' => 'twitch' ),
			array( 'url' => 'twitter.com', 'icon' => 'fab fa-x-twitter', 'class' => 'twitter' ),
			array( 'url' => 'assetstore.unity.com', 'icon' => 'fab fa-unity', 'class' => 'unity' ),
			array( 'url' => 'unsplash.com', 'icon' => 'fab fa-unsplash', 'class' => 'unsplash' ),
			array( 'url' => 'vimeo.com', 'icon' => 'fab fa-vimeo-v', 'class' => 'vimeo' ),
			array( 'url' => 'weibo.com', 'icon' => 'fab fa-weibo', 'class' => 'weibo' ),
			array( 'url' => 'wa.me', 'icon' => 'fab fa-whatsapp', 'class' => 'WhatsApp' ),
			array( 'url' => 'youtube.com', 'icon' => 'fab fa-youtube', 'class' => 'youtube' ),
		);

		return apply_filters( 'inclub_social_icons', $social_icons );
	}
}

/**
 * Get social media icons
 */
 
if ( ! function_exists( 'inclub_get_social_media' ) ) {
	function inclub_get_social_media() {
		global $INCLUB_STORAGE;
		$output = array();
		$social_icons = inclub_social_icons_list();
		$social_urls = explode( ',', get_theme_mod( 'social_urls', $INCLUB_STORAGE['social_urls'] ) );

		foreach( $social_urls as $key => $value ) {
			if ( !empty( $value ) ) {
				$domain = str_ireplace( 'www.', '', parse_url( $value, PHP_URL_HOST ) );
				$index = array_search( strtolower( $domain ), array_column( $social_icons, 'url' ) );
				if( false !== $index ) {
					$output[] = sprintf( '<li class="%1$s"><a href="%2$s" target="_blank" ><i class="%3$s"></i></a></li>',
						$social_icons[$index]['class'],
						esc_url( $value ),
						$social_icons[$index]['icon']
					);
				}
				else {
					$output[] = sprintf( '<li class="nosocial"><a href="%1$s" target="_blank"><i class="%2$s"></i></a></li>',
						esc_url( $value ),
						'fas fa-globe'
					);
				}
			}
		}


		if ( !empty( $output ) ) {
			$output = apply_filters( 'inclub_social_profile_list', $output );
			array_unshift( $output, '<ul class="social-icons">' );
			$output[] = '</ul>';
		}

		return implode( '', $output );
	}
}

/**
 * Social share links
 */
if ( ! function_exists( 'inclub_generate_social_share_links' ) ) {
	function inclub_generate_social_share_links() {
		
		global $INCLUB_STORAGE;
		$social_sharing_links = explode( ',', get_theme_mod( 'social_sharing', $INCLUB_STORAGE['social_sharing'] ) );
		
		$output = array();
		$social_links_array = array();
		$link		= get_the_permalink();
		$title 		= get_the_title();
		$content	= get_the_content();
		$content 	= strip_shortcodes($content);
		$content 	= strip_tags($content);
		$image 		= '';
		
		if( has_post_thumbnail( get_the_ID() ) ) :
			$image = wp_get_attachment_url( get_post_thumbnail_id( get_the_ID() ) );
		endif;
		
		$social_links_array['facebook'] = array(
				'url'        => 'https://www.facebook.com/sharer.php?u=' . rawurlencode( $link ) . '&t=' . rawurlencode( $title ),
				'icon'		 => 'fab fa-facebook-f',
			);
		
		$social_links_array['twitter'] = array(
				'url'        => 'https://twitter.com/share?text=' . rawurlencode( html_entity_decode( $title, ENT_COMPAT, 'UTF-8' ) ) . '&url=' . rawurlencode( $link ),
				'icon'		 => 'fab fa-x-twitter',
			);
		
		$social_links_array['linkedin'] = array(
				'url'        => 'https://www.linkedin.com/shareArticle?mini=true&url=' . $link . '&amp;title=' . rawurlencode( $title ) . '&amp;summary=' . rawurlencode( mb_substr( html_entity_decode( $content, ENT_QUOTES, 'UTF-8' ), 0, 256 ) ),
				'icon'		 => 'fab fa-linkedin-in',
			);
			
		$social_links_array['reddit'] = array(
				'url'        => 'https://reddit.com/submit?url=' . $link . '&amp;title=' . rawurlencode( $title ),
				'icon'		 => 'fab fa-reddit-alien',
			);
		
		$social_links_array['tumblr'] = array(
				'url' => 'https://www.tumblr.com/share/link?url=' . rawurlencode( $link ) . '&amp;name=' . rawurlencode( $title ) . '&amp;description=' . rawurlencode( $content ),
				'icon'		 => 'fab fa-tumblr',
			);
		
		
		$social_links_array['pinterest'] = array(
				'url' => 'https://pinterest.com/pin/create/button/?url=' . rawurlencode( $link ) . '&amp;description=' . rawurlencode( $content ) . '&amp;media=' . rawurlencode( $image ),
				'icon'		 => 'fab fa-pinterest-p',
			);
		
		$social_links_array['vk'] = array(
				'url'        => 'https://vkontakte.ru/share.php?url=' . rawurlencode( $link ) . '&amp;title=' . rawurlencode( $title ) . '&amp;description=' . rawurlencode( $content ),
				'icon'		 => 'fab fa-vk',
			);
		
		$social_links_array['email'] = array(
				'url'        => 'mailto:?subject=' . rawurlencode( $title ) . '&body=' . $link,
				'icon'		 => 'fas fa-envelope',
			);
		
		$social_links_array['whatsapp'] = array(
				'url'        => 'https://api.whatsapp.com/send?text=' . rawurlencode( $link ),
				'icon'		 => 'fab fa-whatsapp',
			);
		
		$social_links_array['stumbleupon'] = array(
				'url'        => 'https://www.stumbleupon.com/submit?url=' . rawurlencode( $link ) . '&amp;title=' . rawurlencode( $title ),
				'icon'		 => 'fab fa-stumbleupon',
			);

		$social_links_array['telegram'] = array(
				'url'        => 'https://telegram.me/share/url?url=' . rawurlencode( $link ) . '&amp;text=' . rawurlencode( $title ),
				'icon'		 => 'fab fa-telegram-plane',
			);
			
			$social_links_array['xing'] = array(
				'url'        => 'https://www.xing.com/social_plugins/share/new?sc_p=xing-share&amp;h=1&amp;url=' . rawurlencode( $link ),
				'icon'		 => 'fa-brands fa-square-xing',
			);
		foreach($social_sharing_links as $site) {
			if ( !empty( $site ) ) {
				$url = $social_links_array[$site]['url'];
				$icon = $social_links_array[$site]['icon'];
				$output[] = sprintf( '<li><a href="%1$s" rel="nofollow" target="_blank"><i class="%2$s"></i></a></li>',
							esc_url( $url ),
							esc_attr( $icon )
						);
			}
		}
		
		if ( !empty( $output ) ) {
			array_unshift( $output, '<ul>' );
			$output[] = '</ul>';
		}

		return implode( '', $output );
	}
}

add_action( 'admin_init', function() {
	if ( did_action( 'elementor/loaded' ) ) {
		remove_action( 'admin_init', [ \Elementor\Plugin::$instance->admin, 'maybe_redirect_to_getting_started' ] );
	}
}, 1 );

if ( ! function_exists( 'inclub_custom_excerpt_length' ) ) {
	function inclub_custom_excerpt_length( $length ) {
		return apply_filters( 'inclub_excerpt_length', 12 );
	}
}

add_filter( 'excerpt_length', 'inclub_custom_excerpt_length', 999 );

if ( ! function_exists( 'inclub_wp_footer' ) ) {
	function inclub_wp_footer() {
		global $INCLUB_STORAGE;
		$small_heading_icon =  get_theme_mod( 'small_heading_icon', $INCLUB_STORAGE['small_heading_icon'] );
		if( $small_heading_icon ) { 
		$background_image 	= 	wp_get_attachment_image_src( $small_heading_icon , 'full' );
		if(isset($background_image[0])) {
			$background_image	=	$background_image[0];
		}
		?>
		<style>
			.section-title .elementor-heading-title::before,
			.section-title.dark-section .elementor-heading-title::before{
				background-image: url(<?php echo esc_url($background_image); ?>);
			}
		</style>
		<?php
		 }
	}
}
add_action( 'wp_footer', 'inclub_wp_footer' );


if ( ! function_exists( 'inclub_render_icon' ) ) {
    function inclub_render_icon( $file ) {
         return '<i class="fa-solid fa-arrow-right"></i>';
    }
}


if ( ! function_exists( 'inclub_render_svg' ) ) {
    function inclub_render_svg( $file ) {
        $valid_svg = false;

        // Check if the file exists
        if ( file_exists( $file ) ) {
            // Read the file contents
            $svgContent = file_get_contents( $file );

            // Ensure the file is an SVG by checking for the <svg> tag
            if ( strpos( $svgContent, '<svg' ) !== false ) {
                // Sanitize the SVG content if the sanitizer class exists
                if ( class_exists( 'Elementor\\Core\\Utils\\Svg\\Svg_Sanitizer' ) ) {
                    $sanitizer = new Elementor\Core\Utils\Svg\Svg_Sanitizer();
                    $valid_svg = $sanitizer->sanitize( $svgContent );
                } 
            }
        }

        // If SVG is invalid, fallback to rendering as an image tag
        if ( false === $valid_svg ) {
            $valid_svg = inclub_render_icon( $file );
        }

        return $valid_svg;
    }
}