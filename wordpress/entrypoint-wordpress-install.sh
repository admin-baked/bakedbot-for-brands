#!/bin/bash
set -e

APACHE_PORT="${PORT:-8080}"
echo "[entrypoint] Starting WordPress on port ${APACHE_PORT}"

# Configure Apache port
sed -i "s/Listen 80/Listen ${APACHE_PORT}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${APACHE_PORT}>/" /etc/apache2/sites-enabled/000-default.conf
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Wait for database to be ready
echo "[entrypoint] Waiting for database..."
until mysqladmin ping --host=${WORDPRESS_DB_HOST:-cloudsql-proxy:3306} --user=${WORDPRESS_DB_USER:-wpadmin} --password=${WORDPRESS_DB_PASSWORD:-} --silent; do
  echo "Waiting for database..."
  sleep 2
done
echo "[entrypoint] Database is ready!"

# If WordPress is not installed yet, copy the default WordPress files
if [ ! -f /var/www/html/wp-config.php ]; then
  echo "[entrypoint] WordPress not installed, copying default files..."
  cp -rT /usr/src/wordpress /var/www/html
fi

# Create wp-config.php with database configuration
echo "[entrypoint] Creating wp-config.php..."
cat > /var/www/html/wp-config.php << EOL
<?php
/** The name of the database for WordPress */
define( 'DB_NAME', '${WORDPRESS_DB_NAME:-wordpress}' );

/** MySQL database username */
define( 'DB_USER', '${WORDPRESS_DB_USER:-wpadmin}' );

/** MySQL database password */
define( 'DB_PASSWORD', '${WORDPRESS_DB_PASSWORD:-}' );

/** MySQL hostname */
define( 'DB_HOST', '${WORDPRESS_DB_HOST:-cloudsql-proxy:3306}' );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The Database Collate type. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication Unique Keys and Salts.
 */
define( 'AUTH_KEY',         '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'SECURE_AUTH_KEY',  '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'LOGGED_IN_KEY',    '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'NONCE_KEY',        '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'AUTH_SALT',        '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'SECURE_AUTH_SALT', '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'LOGGED_IN_SALT',   '$(head -c 64 /dev/urandom | base64 -w 0)' );
define( 'NONCE_SALT',       '$(head -c 64 /dev/urandom | base64 -w 0)' );

/**#@-*/

/**
 * WordPress Database Table prefix.
 */
\$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 */
define( 'WP_DEBUG', false );

/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
EOL

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Start Apache
echo "[entrypoint] Starting Apache..."
exec apache2-foreground