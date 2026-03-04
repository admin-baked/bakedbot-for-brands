<?php
namespace ElementsKit\Modules\Sticky_Content;

defined( 'ABSPATH' ) || exit;

class Init {
    private $dir;
    private $url;

    public function __construct(){
        // get current directory path
        $this->dir = dirname(__FILE__) . '/';

        // get current module's url
		$this->url = \ElementsKit::plugin_url() . 'modules/sticky-content/';
		
		// Register frontend scripts
		add_action( 'elementor/frontend/before_register_scripts', [ $this, 'register_frontend_scripts' ] );

		// include all necessary files
		$this->include_files();

		// calling the sticky controls
		new \Elementor\ElementsKit_Extend_Sticky();
	}
	
	public function include_files(){
		include $this->dir . 'extend-controls.php';
	}

	/**
	 * Check if Elementor's assets loader exists
	 * @return bool
	 */
	private function is_assets_loader_exist() {
		return ! ! \Elementor\Plugin::$instance->assets_loader;
	}

	/**
	 * Get assets configuration
	 * @return array
	 */
	private function get_assets_config() {
		return [
			'scripts' => [
				'elementskit-sticky-content' => [
					'src' => $this->url . 'assets/js/elementskit-sticky-content.js',
					'version' => \ElementsKit::version(),
					'dependencies' => [],
					'in_footer' => true,
				],
			],
		];
	}

	/**
	 * Register frontend scripts and styles
	 */
	public function register_frontend_scripts() {
		$assets = $this->get_assets_config();

		// Register styles
		if (!empty($assets['styles'])) {
			foreach ($assets['styles'] as $handle => $style) {
				wp_register_style(
					$handle,
					$style['src'],
					$style['dependencies'] ?? [],
					$style['version'] ?? \ElementsKit::version(),
					$style['media'] ?? 'all'
				);
			}
		}

		// Register scripts
		if (!empty($assets['scripts'])) {
			foreach ($assets['scripts'] as $handle => $script) {
				$args = [];

				// Handle in_footer parameter
				if (isset($script['in_footer'])) {
					$args['in_footer'] = $script['in_footer'];
				}

				wp_register_script(
					$handle,
					$script['src'],
					$script['dependencies'] ?? [],
					$script['version'] ?? \ElementsKit::version(),
					$args
				);
			}
		}

		// Add to Elementor's assets loader if available
		if ( $this->is_assets_loader_exist() && $assets ) {
			\Elementor\Plugin::$instance->assets_loader->add_assets($assets);
		}
	}
}
