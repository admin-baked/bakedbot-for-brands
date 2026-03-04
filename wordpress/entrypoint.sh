#!/bin/bash
set -e

APACHE_PORT="${PORT:-8080}"
echo "[entrypoint] Starting WordPress on port ${APACHE_PORT}"

sed -i "s/Listen 80/Listen ${APACHE_PORT}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${APACHE_PORT}>/" /etc/apache2/sites-enabled/000-default.conf
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Cloud SQL socket: use localhost:<socket_path> format for WordPress PHP MySQL driver
# WORDPRESS_DB_HOST is set via Cloud Run env var as: localhost:/cloudsql/CONNECTION_NAME
# Do NOT override it here - just print for debugging
echo "[entrypoint] DB host: ${WORDPRESS_DB_HOST}"

export WORDPRESS_CONFIG_EXTRA="
define('WP_HOME', getenv('WP_HOME') ?: 'http://localhost');
define('WP_SITEURL', getenv('WP_SITEURL') ?: 'http://localhost');
define('FORCE_SSL_ADMIN', false);
define('DISALLOW_FILE_MODS', false);
"

# Run WP-CLI plugin activation after WordPress files are in place (background, after docker-entrypoint copies files)
activate_plugins() {
  echo "[entrypoint] Waiting for WordPress files to be available..."
  for i in $(seq 1 60); do
    if [ -f /var/www/html/wp-load.php ]; then
      break
    fi
    sleep 2
  done
  echo "[entrypoint] WordPress files ready. Activating plugins via WP-CLI..."
  wp plugin activate elementor elementskit-lite elementskit inclub-theme-addons contact-form-7 \
    --allow-root --path=/var/www/html 2>&1 | sed 's/^/[wp-cli] /' || true
  echo "[entrypoint] Plugin activation complete."
}

activate_plugins &

exec docker-entrypoint.sh apache2-foreground
