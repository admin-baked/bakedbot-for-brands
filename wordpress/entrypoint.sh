#!/bin/bash
set -euo pipefail

APACHE_PORT="${PORT:-8080}"
DOCROOT="/var/www/html"
WP_SOURCE="/usr/src/wordpress"
WP_CONFIG="${DOCROOT}/wp-config.php"
WP_CONFIG_EXTRA="${DOCROOT}/wp-config-extra.php"
WP_EXTRA_REQUIRE="if (file_exists(__DIR__ . '/wp-config-extra.php')) { require_once __DIR__ . '/wp-config-extra.php'; }"

echo "[entrypoint] Starting WordPress on port ${APACHE_PORT}"

sed -ri "s/^Listen 80$/Listen ${APACHE_PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \\*:80>/<VirtualHost *:${APACHE_PORT}>/" /etc/apache2/sites-enabled/000-default.conf

if ! grep -q "^ServerName localhost$" /etc/apache2/apache2.conf; then
  echo "ServerName localhost" >> /etc/apache2/apache2.conf
fi

mkdir -p "${DOCROOT}/wp-content/themes" "${DOCROOT}/wp-content/plugins"

if [ ! -f "${DOCROOT}/index.php" ] && [ -d "${WP_SOURCE}" ]; then
  echo "[entrypoint] Copying WordPress core files into ${DOCROOT}"
  cp -a "${WP_SOURCE}/." "${DOCROOT}/"
fi

if [ -d "${WP_SOURCE}/wp-content/themes/inclub" ]; then
  cp -a "${WP_SOURCE}/wp-content/themes/inclub" "${DOCROOT}/wp-content/themes/"
fi

if [ -d "${WP_SOURCE}/wp-content/plugins" ]; then
  cp -a "${WP_SOURCE}/wp-content/plugins/." "${DOCROOT}/wp-content/plugins/"
fi

cat > "${WP_CONFIG_EXTRA}" <<EOF
<?php
define('WP_HOME', getenv('WP_HOME') ?: 'http://localhost');
define('WP_SITEURL', getenv('WP_SITEURL') ?: 'http://localhost');
define('FORCE_SSL_ADMIN', false);
define('DISALLOW_FILE_MODS', false);
EOF

if [ ! -f "${WP_CONFIG}" ]; then
  echo "[entrypoint] Creating wp-config.php from runtime environment"
  if ! wp config create \
    --allow-root \
    --path="${DOCROOT}" \
    --dbname="${WORDPRESS_DB_NAME:-wordpress}" \
    --dbuser="${WORDPRESS_DB_USER:-root}" \
    --dbpass="${WORDPRESS_DB_PASSWORD:-}" \
    --dbhost="${WORDPRESS_DB_HOST:-localhost}" \
    --dbprefix="${WORDPRESS_TABLE_PREFIX:-wp_}" \
    --skip-check \
    --extra-php="${WP_EXTRA_REQUIRE}"; then
    rm -f "${WP_CONFIG}"
    wp config create \
      --allow-root \
      --path="${DOCROOT}" \
      --dbname="${WORDPRESS_DB_NAME:-wordpress}" \
      --dbuser="${WORDPRESS_DB_USER:-root}" \
      --dbpass="${WORDPRESS_DB_PASSWORD:-}" \
      --dbhost="${WORDPRESS_DB_HOST:-localhost}" \
      --dbprefix="${WORDPRESS_TABLE_PREFIX:-wp_}" \
      --skip-check \
      --skip-salts \
      --extra-php="${WP_EXTRA_REQUIRE}"
  fi
elif ! grep -q "wp-config-extra.php" "${WP_CONFIG}"; then
  printf "\n%s\n" "${WP_EXTRA_REQUIRE}" >> "${WP_CONFIG}"
fi

exec apache2-foreground
