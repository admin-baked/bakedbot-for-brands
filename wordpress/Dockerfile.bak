FROM wordpress:php8.2-apache

# Install WP-CLI and needed tools
RUN apt-get update && apt-get install -y wget unzip curl default-mysql-client && \
    wget -q https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -O /usr/local/bin/wp && \
    chmod +x /usr/local/bin/wp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Configure Apache for port 8080
RUN sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf && \
    sed -i 's/<VirtualHost \*:80>/<VirtualHost *:8080>/' /etc/apache2/sites-enabled/000-default.conf && \
    a2enmod rewrite && \
    sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Copy InClub theme and bundled plugins
COPY inclub/ /var/www/html/wp-content/themes/inclub/
COPY plugins/ /var/www/html/wp-content/plugins/

# Install and activate plugins and theme after WordPress is initialized
COPY wp-init.sh /wp-init.sh
RUN chmod +x /wp-init.sh

# Cloud Run expects port 8080
EXPOSE 8080

ENTRYPOINT ["/bin/sh", "/wp-init.sh"]