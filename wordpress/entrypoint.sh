#!/bin/bash
set -e

APACHE_PORT="${PORT:-8080}"
echo "[entrypoint] Starting WordPress on port ${APACHE_PORT}"

# Configure Apache port
sed -i "s/Listen 80/Listen ${APACHE_PORT}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${APACHE_PORT}>/" /etc/apache2/sites-enabled/000-default.conf
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Cloud SQL socket configuration
echo "[entrypoint] DB host: ${WORDPRESS_DB_HOST}"

# Add custom WordPress configuration
cat > /var/www/html/wp-config-extra.php << EOL
<?php
define('WP_HOME', getenv('WP_HOME') ?: 'http://localhost');
define('WP_SITEURL', getenv('WP_SITEURL') ?: 'http://localhost');
define('FORCE_SSL_ADMIN', false);
define('DISALLOW_FILE_MODS', false);
EOL

# Ensure wp-config.php includes our extra configuration
if [ ! -f /var/www/html/wp-config.php ]; then
  echo "[entrypoint] Waiting for wp-config.php to be generated..."
  until [ -f /var/www/html/wp-config.php ]; do
    sleep 2
  done
fi

# Append custom config to wp-config.php
echo "require_once(ABSPATH . 'wp-config-extra.php');" >> /var/www/html/wp-config.php

# Start Apache
exec apache2-foreground