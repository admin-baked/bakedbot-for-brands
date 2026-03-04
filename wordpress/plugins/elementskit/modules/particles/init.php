<?php
namespace ElementsKit\Modules\Particles;

defined( 'ABSPATH' ) || exit;

class Init {

	private $dir;
	private $url;

	public function __construct() {

		// get current directory path
		$this->dir = dirname(__FILE__) . '/';

		// get current module's url
		$this->url = \ElementsKit::plugin_url() . 'modules/particles/';

		// Register frontend scripts
		add_action('elementor/frontend/before_register_scripts', [$this, 'register_frontend_scripts']);

		// include all necessary files
		$this->include_files();

		// calling the particles controls
		new \Elementor\ElementsKit_Particles();
	}

	public function include_files() {
		include $this->dir . 'particles.php';
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
			'styles' => [
				'ekit-particles' => [
					'src' => $this->url . 'assets/css/particles.css',
					'version' => \ElementsKit::version(),
					'dependencies' => [],
				],
			],
			'scripts' => [
				'particles' => [
					'src' => $this->url . 'assets/js/particles.min.js',
					'version' => \ElementsKit::version(),
					'dependencies' => [],
					'in_footer' => true,
				],
				'ekit-particles' => [
					'src' => $this->url . 'assets/js/ekit-particles.js',
					'version' => \ElementsKit::version(),
					'dependencies' => ['particles'],
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
