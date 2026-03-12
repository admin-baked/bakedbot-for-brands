#!/bin/bash
set -euo pipefail

DOCROOT="${DOCROOT:-/var/www/html}"
WP_SOURCE="${WP_SOURCE:-/usr/src/wordpress}"
WP_CONFIG="${DOCROOT}/wp-config.php"
WP_CONFIG_EXTRA="${DOCROOT}/wp-config-extra.php"
WP_EXTRA_REQUIRE="if (file_exists(__DIR__ . '/wp-config-extra.php')) { require_once __DIR__ . '/wp-config-extra.php'; }"

WP_IMPORT_DEMO_URL="${WP_IMPORT_DEMO_URL:-https://cdn.awaikenthemes.com/demo-content/inclub/inclub.xml}"
WP_IMPORT_FRONT_PAGE_SLUG="${WP_IMPORT_FRONT_PAGE_SLUG:-home-video}"
WP_HEADER_MENU_NAME="${WP_HEADER_MENU_NAME:-Header Menu}"
WP_FOOTER_MENU_NAME="${WP_FOOTER_MENU_NAME:-Footer Menu}"

DB_HOST_RAW="${WORDPRESS_DB_HOST:-localhost}"
DB_HOST="${DB_HOST_RAW}"
DB_PORT=""

if [[ "${DB_HOST_RAW}" == *":"* && "${DB_HOST_RAW}" != */* ]]; then
  DB_HOST="${DB_HOST_RAW%%:*}"
  DB_PORT="${DB_HOST_RAW##*:}"
fi

export HOME="${HOME:-/tmp/wpcli}"
mkdir -p "${HOME}" "${DOCROOT}"

echo "[wp-demo-import] Preparing WordPress files in ${DOCROOT}"
if [ ! -f "${DOCROOT}/index.php" ] && [ -d "${WP_SOURCE}" ]; then
  cp -a "${WP_SOURCE}/." "${DOCROOT}/"
fi

mkdir -p "${DOCROOT}/wp-content/themes" "${DOCROOT}/wp-content/plugins" "${DOCROOT}/wp-content/mu-plugins"

if [ -d "${WP_SOURCE}/wp-content/themes/inclub" ]; then
  rm -rf "${DOCROOT}/wp-content/themes/inclub"
  cp -a "${WP_SOURCE}/wp-content/themes/inclub" "${DOCROOT}/wp-content/themes/"
fi

if [ -d "${WP_SOURCE}/wp-content/plugins" ]; then
  cp -a "${WP_SOURCE}/wp-content/plugins/." "${DOCROOT}/wp-content/plugins/"
fi

if [ -d "${WP_SOURCE}/wp-content/mu-plugins" ]; then
  cp -a "${WP_SOURCE}/wp-content/mu-plugins/." "${DOCROOT}/wp-content/mu-plugins/"
fi

cat > "${WP_CONFIG_EXTRA}" <<EOF
<?php
\$bbUseForwardedHost = filter_var(getenv('WP_USE_FORWARDED_HOST') ?: 'false', FILTER_VALIDATE_BOOLEAN);
\$bbForwardedHostHeader = \$bbUseForwardedHost
  ? (\$_SERVER['HTTP_X_FORWARDED_HOST'] ?? \$_SERVER['HTTP_HOST'] ?? '')
  : '';
\$bbForwardedHostParts = array_filter(array_map('trim', explode(',', \$bbForwardedHostHeader)));
\$bbForwardedHost = \$bbForwardedHostParts ? reset(\$bbForwardedHostParts) : '';
\$bbScheme = \$_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'https';
\$bbHostOnly = preg_replace('/:\d+$/', '', \$bbForwardedHost);
\$bbPort = \$bbScheme === 'https' ? '443' : '80';
\$bbHttps = \$bbScheme === 'https' ? 'on' : 'off';

if (\$bbHostOnly) {
  \$_SERVER['HTTP_HOST'] = \$bbForwardedHost;
  \$_SERVER['SERVER_NAME'] = \$bbHostOnly;
  \$_SERVER['SERVER_PORT'] = \$bbPort;
  \$_SERVER['REQUEST_SCHEME'] = \$bbScheme;
  \$_SERVER['HTTPS'] = \$bbHttps;
}

\$bbDynamicBaseUrl = \$bbForwardedHost ? "\${bbScheme}://\${bbForwardedHost}" : '';
\$bbHome = \$bbDynamicBaseUrl ?: (getenv('WP_HOME') ?: 'https://andrews-wp-lo74oftdza-uc.a.run.app');
\$bbSiteUrl = \$bbDynamicBaseUrl ?: (getenv('WP_SITEURL') ?: \$bbHome);
define('WP_HOME', \$bbHome);
define('WP_SITEURL', \$bbSiteUrl);
EOF

if [ ! -f "${WP_CONFIG}" ]; then
  echo "[wp-demo-import] Creating wp-config.php"
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
elif ! grep -q "wp-config-extra.php" "${WP_CONFIG}"; then
  printf "\n%s\n" "${WP_EXTRA_REQUIRE}" >> "${WP_CONFIG}"
fi

echo "[wp-demo-import] Waiting for WordPress database access on ${DB_HOST_RAW}"
for attempt in $(seq 1 30); do
  if wp core is-installed --allow-root --path="${DOCROOT}" >/dev/null 2>&1; then
    break
  fi

  if [ "${attempt}" -eq 30 ]; then
    echo "[wp-demo-import] WordPress could not reach the database in time" >&2
    exit 1
  fi

  sleep 2
done

echo "[wp-demo-import] Verifying WordPress install"
wp core is-installed --allow-root --path="${DOCROOT}"

echo "[wp-demo-import] Activating bundled theme and plugins"
wp theme activate inclub --allow-root --path="${DOCROOT}"
wp plugin activate elementskit --allow-root --path="${DOCROOT}" || true
wp plugin activate inclub-theme-addons --allow-root --path="${DOCROOT}" || true

if ! wp plugin is-installed elementor --allow-root --path="${DOCROOT}"; then
  wp plugin install elementor --activate --allow-root --path="${DOCROOT}"
else
  wp plugin activate elementor --allow-root --path="${DOCROOT}" || true
fi

if ! wp plugin is-installed contact-form-7 --allow-root --path="${DOCROOT}"; then
  wp plugin install contact-form-7 --activate --allow-root --path="${DOCROOT}"
else
  wp plugin activate contact-form-7 --allow-root --path="${DOCROOT}" || true
fi

echo "[wp-demo-import] Ensuring WP-CLI import command is available"
if ! wp package list --allow-root 2>/dev/null | grep -q 'wp-cli/import-command'; then
  wp package install wp-cli/import-command --allow-root
fi

if ! wp plugin is-installed wordpress-importer --allow-root --path="${DOCROOT}"; then
  wp plugin install wordpress-importer --activate --allow-root --path="${DOCROOT}"
else
  wp plugin activate wordpress-importer --allow-root --path="${DOCROOT}" || true
fi

if ! wp post list --post_type=page --name="${WP_IMPORT_FRONT_PAGE_SLUG}" --field=ID --allow-root --path="${DOCROOT}" | grep -q .; then
  echo "[wp-demo-import] Importing demo content from ${WP_IMPORT_DEMO_URL}"
  curl -fsSL "${WP_IMPORT_DEMO_URL}" -o /tmp/inclub-demo.xml
  wp import /tmp/inclub-demo.xml --authors=create --skip=attachment --allow-root --path="${DOCROOT}"
fi

HOME_VIDEO_ID="$(wp post list --post_type=page --name="${WP_IMPORT_FRONT_PAGE_SLUG}" --field=ID --allow-root --path="${DOCROOT}" | head -n 1)"
if [ -z "${HOME_VIDEO_ID}" ]; then
  echo "[wp-demo-import] Front page slug ${WP_IMPORT_FRONT_PAGE_SLUG} not found after import" >&2
  exit 1
fi

echo "[wp-demo-import] Setting front page to ${WP_IMPORT_FRONT_PAGE_SLUG} (${HOME_VIDEO_ID})"
wp option update show_on_front page --allow-root --path="${DOCROOT}"
wp option update page_on_front "${HOME_VIDEO_ID}" --allow-root --path="${DOCROOT}"
wp option update page_for_posts 0 --allow-root --path="${DOCROOT}"
wp option update permalink_structure '/%postname%/' --allow-root --path="${DOCROOT}"

assign_menu_location() {
  local menu_name="$1"
  local location="$2"
  local menu_id

  menu_id="$(
    wp menu list --allow-root --path="${DOCROOT}" --fields=term_id,name --format=csv \
      | tail -n +2 \
      | awk -F, -v target="${menu_name}" '$2 == target { print $1; exit }'
  )"

  if [ -n "${menu_id}" ]; then
    wp menu location assign "${menu_id}" "${location}" --allow-root --path="${DOCROOT}" || true
  fi
}

assign_menu_location "${WP_HEADER_MENU_NAME}" header
assign_menu_location "${WP_FOOTER_MENU_NAME}" footer

wp rewrite flush --hard --allow-root --path="${DOCROOT}"
wp cache flush --allow-root --path="${DOCROOT}" || true

echo "[wp-demo-import] Active template: $(wp option get template --allow-root --path="${DOCROOT}")"
echo "[wp-demo-import] Active stylesheet: $(wp option get stylesheet --allow-root --path="${DOCROOT}")"
echo "[wp-demo-import] page_on_front: $(wp option get page_on_front --allow-root --path="${DOCROOT}")"
