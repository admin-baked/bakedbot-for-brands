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

  # Import InClub demo content (one-time, flag stored in DB)
  DEMO_IMPORTED=$(wp option get inclub_demo_imported --allow-root --path=/var/www/html 2>/dev/null || echo "")
  if [ "$DEMO_IMPORTED" != "1" ]; then
    echo "[entrypoint] Importing InClub demo content..."
    # Install wordpress-importer if needed
    wp plugin install wordpress-importer --activate --allow-root --path=/var/www/html 2>&1 | sed 's/^/[wp-cli] /' || true
    # Download demo XML to /tmp (always writable)
    curl -sL https://cdn.awaikenthemes.com/demo-content/inclub/inclub.xml -o /tmp/inclub-demo.xml
    # Import content
    wp import /tmp/inclub-demo.xml --authors=create --allow-root --path=/var/www/html 2>&1 | sed 's/^/[wp-cli] /' || true
    rm -f /tmp/inclub-demo.xml
    # Import customizer settings
    curl -sL https://cdn.awaikenthemes.com/demo-content/inclub/inclub.dat -o /tmp/inclub-customizer.dat
    wp customizer import /tmp/inclub-customizer.dat --allow-root --path=/var/www/html 2>&1 | sed 's/^/[wp-cli] /' || true
    rm -f /tmp/inclub-customizer.dat
    # Set front page to 'Home' and posts page
    FRONT_PAGE_ID=$(wp post list --post_type=page --post_status=publish --title='Home' --field=ID --allow-root --path=/var/www/html 2>/dev/null | head -1)
    if [ -n "$FRONT_PAGE_ID" ]; then
      wp option update show_on_front page --allow-root --path=/var/www/html 2>/dev/null || true
      wp option update page_on_front "$FRONT_PAGE_ID" --allow-root --path=/var/www/html 2>/dev/null || true
    fi
    # Set nav menu locations
    HEADER_MENU_ID=$(wp term list nav_menu --field=term_id --name='Header Menu' --allow-root --path=/var/www/html 2>/dev/null | head -1)
    if [ -n "$HEADER_MENU_ID" ]; then
      wp theme mod set nav_menu_locations --value='{"header":'"$HEADER_MENU_ID"'}' --allow-root --path=/var/www/html 2>/dev/null || true
    fi
    wp option update inclub_demo_imported 1 --allow-root --path=/var/www/html 2>/dev/null || true
    echo "[entrypoint] Demo import complete."
  else
    echo "[entrypoint] Demo already imported, skipping."
  fi
}

activate_plugins &

exec docker-entrypoint.sh apache2-foreground
