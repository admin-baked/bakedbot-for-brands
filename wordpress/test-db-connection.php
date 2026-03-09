<?php
// Test database connection
$host = getenv('WORDPRESS_DB_HOST') ?: 'cloudsql-proxy:3306';
$dbname = getenv('WORDPRESS_DB_NAME') ?: 'andrews-wp-db';
$user = getenv('WORDPRESS_DB_USER') ?: 'wpadmin';
$pass = getenv('WORDPRESS_DB_PASSWORD') ?: '';

echo "Testing database connection...\n";
echo "Host: $host\n";
echo "Database: $dbname\n";
echo "User: $user\n";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    echo "Connection failed: " . $conn->connect_error . "\n";
} else {
    echo "Connection successful!\n";

    // Check if WordPress tables exist
    $result = $conn->query("SHOW TABLES LIKE 'wp_options'");
    if ($result->num_rows > 0) {
        echo "WordPress tables found!\n";
    } else {
        echo "No WordPress tables found. WordPress may not be installed yet.\n";
    }
}

$conn->close();
?>