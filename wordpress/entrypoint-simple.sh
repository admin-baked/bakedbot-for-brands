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

# Check if WordPress is already installed
if [ ! -f /var/www/html/wp-config.php ]; then
  echo "[entrypoint] WordPress not installed yet, you need to run the web installer"
  # Copy the default WordPress files if they exist
  if [ -d /usr/src/wordpress ]; then
    echo "[entrypoint] Copying WordPress files..."
    cp -rT /usr/src/wordpress /var/www/html
  fi
else
  echo "[entrypoint] WordPress already installed"
fi

# Start Apache
echo "[entrypoint] Starting Apache..."
exec apache2-foreground