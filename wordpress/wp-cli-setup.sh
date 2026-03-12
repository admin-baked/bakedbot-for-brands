#!/bin/bash
# One-shot WP-CLI setup script for Cloud Run Job
# Runs WordPress file copy + wp-config setup, then installs WP via WP-CLI
set -e

WP_URL="${WP_HOME:-https://bakedbot.ai/andrewsdevelopments}"
WP_SITE_TITLE="${WP_SITE_TITLE:-Andrews Developments}"
WP_ADMIN_USER="${WP_ADMIN_USER:-marcus_admin}"
WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-marcus@andrewsdevelopments.com}"
WP_ADMIN_PASSWORD="${WP_ADMIN_PASSWORD:-}"

echo "[wp-cli-setup] Starting WordPress file copy..."

# Copy WordPress core files (same logic as docker-entrypoint.sh)
if [ ! -e /var/www/html/index.php ]; then
  cp -rT /usr/src/wordpress /var/www/html
  echo "[wp-cli-setup] WordPress files copied."
fi

# Create wp-config.php from environment variables
if [ ! -e /var/www/html/wp-config.php ]; then
  echo "[wp-cli-setup] Creating wp-config.php..."
  wp config create \
    --dbname="${WORDPRESS_DB_NAME:-wordpress}" \
    --dbuser="${WORDPRESS_DB_USER:-root}" \
    --dbpass="${WORDPRESS_DB_PASSWORD:-}" \
    --dbhost="${WORDPRESS_DB_HOST:-localhost}" \
    --dbprefix="${WORDPRESS_TABLE_PREFIX:-wp_}" \
    --extra-php="define('WP_HOME', '${WP_HOME:-http://localhost}');\ndefine('WP_SITEURL', '${WP_SITEURL:-http://localhost}');" \
    --allow-root \
    --path=/var/www/html
fi

echo "[wp-cli-setup] Testing database connection..."
wp db check --allow-root --path=/var/www/html 2>&1 || echo "DB check failed, continuing anyway..."

echo "[wp-cli-setup] Installing WordPress core..."
if [ -z "${WP_ADMIN_PASSWORD}" ]; then
  echo "[wp-cli-setup] WP_ADMIN_PASSWORD must be set before installing WordPress." >&2
  exit 1
fi

wp core install \
  --url="${WP_URL}" \
  --title="${WP_SITE_TITLE}" \
  --admin_user="${WP_ADMIN_USER}" \
  --admin_email="${WP_ADMIN_EMAIL}" \
  --admin_password="${WP_ADMIN_PASSWORD}" \
  --skip-email \
  --allow-root \
  --path=/var/www/html

echo "[wp-cli-setup] Activating InClub theme..."
wp theme activate inclub --allow-root --path=/var/www/html

echo "[wp-cli-setup] Activating plugins..."
wp plugin activate elementskit --allow-root --path=/var/www/html || echo "elementskit activation skipped"
wp plugin activate inclub-theme-addons --allow-root --path=/var/www/html || echo "inclub-theme-addons activation skipped"

echo "[wp-cli-setup] Setting up permalinks..."
wp option update permalink_structure "/%postname%/" --allow-root --path=/var/www/html

echo "[wp-cli-setup] WordPress setup complete!"
wp core version --allow-root --path=/var/www/html
