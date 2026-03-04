#!/bin/bash
# One-shot WP-CLI setup script for Cloud Run Job
# Runs WordPress file copy + wp-config setup, then installs WP via WP-CLI
set -e

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
wp core install \
  --url="https://bakedbot.ai/andrewsdevelopments" \
  --title="Andrews Developments" \
  --admin_user="marcus_admin" \
  --admin_email="marcus@andrewsdevelopments.com" \
  --admin_password="AndrewsDev2026!" \
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
