#!/bin/bash
set -e

WP_URL="${WP_HOME:-https://bakedbot.ai/andrewsdevelopments}"
WP_SITE_TITLE="${WP_SITE_TITLE:-Andrews Developments}"
WP_ADMIN_USER="${WP_ADMIN_USER:-marcus_admin}"
WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-marcus@andrewsdevelopments.com}"
WP_ADMIN_PASSWORD="${WP_ADMIN_PASSWORD:-}"

echo "[init] Starting WordPress initialization..."

# Wait for database to be ready
echo "[init] Waiting for database connection..."
until wp db check --allow-root --path=/var/www/html; do
    echo "[init] Waiting for database..."
    sleep 3
done
echo "[init] Database connection established."

# Check if WordPress is already installed
if ! wp core is-installed --allow-root --path=/var/www/html; then
    echo "[init] Installing WordPress..."

    if [ -z "${WP_ADMIN_PASSWORD}" ]; then
        echo "[init] WP_ADMIN_PASSWORD must be set before installing WordPress." >&2
        exit 1
    fi

    # Install WordPress
    wp core install \
        --url="${WP_URL}" \
        --title="${WP_SITE_TITLE}" \
        --admin_user="${WP_ADMIN_USER}" \
        --admin_password="${WP_ADMIN_PASSWORD}" \
        --admin_email="${WP_ADMIN_EMAIL}" \
        --allow-root \
        --path=/var/www/html \
        --skip-email

    echo "[init] WordPress installation complete."

    # Install and activate plugins
    echo "[init] Installing and activating plugins..."
    wp plugin activate elementor elementskit-lite elementskit inclub-theme-addons contact-form-7 \
        --allow-root --path=/var/www/html || true

    # Set InClub theme
    echo "[init] Setting InClub theme..."
    wp theme activate inclub --allow-root --path=/var/www/html || true

    # Import demo content
    echo "[init] Importing demo content..."
    # Download demo XML
    curl -sL https://cdn.awaikenthemes.com/demo-content/inclub/inclub.xml -o /tmp/inclub-demo.xml
    # Import content
    wp import /tmp/inclub-demo.xml --authors=create --allow-root --path=/var/www/html || true
    rm -f /tmp/inclub-demo.xml

    # Import customizer settings
    echo "[init] Importing customizer settings..."
    curl -sL https://cdn.awaikenthemes.com/demo-content/inclub/inclub.dat -o /tmp/inclub-customizer.dat
    wp theme mod import /tmp/inclub-customizer.dat --allow-root --path=/var/www/html || true
    rm -f /tmp/inclub-customizer.dat

    # Set front page
    echo "[init] Setting front page..."
    FRONT_PAGE_ID=$(wp post list --post_type=page --post_status=publish --title='Home - Video' --field=ID --allow-root --path=/var/www/html 2>/dev/null | head -1)
    if [ -n "$FRONT_PAGE_ID" ]; then
        wp option update show_on_front page --allow-root --path=/var/www/html
        wp option update page_on_front "$FRONT_PAGE_ID" --allow-root --path=/var/www/html
        echo "[init] Front page set to Home - Video (ID: $FRONT_PAGE_ID)"
    fi

    # Set navigation
    echo "[init] Setting navigation..."
    HEADER_MENU_ID=$(wp term list nav_menu --field=term_id --name='Header Menu' --allow-root --path=/var/www/html 2>/dev/null | head -1)
    if [ -n "$HEADER_MENU_ID" ]; then
        wp theme mod set nav_menu_locations --value='{"header":"'"$HEADER_MENU_ID"'"}' --allow-root --path=/var/www/html
    fi

    echo "[init] WordPress setup complete."
else
    echo "[init] WordPress already installed. Activating theme..."
    wp theme activate inclub --allow-root --path=/var/www/html || true
    wp plugin activate elementor elementskit-lite elementskit inclub-theme-addons contact-form-7 \
        --allow-root --path=/var/www/html || true
fi

# Start Apache
echo "[init] Starting Apache..."
exec apache2-foreground
