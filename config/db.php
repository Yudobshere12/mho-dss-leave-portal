<?php
// config/db.php - Centralized Database Connection & Global Security

define('DB_HOST', 'localhost');
define('DB_USER', 'root');      // Default XAMPP MySQL username
define('DB_PASS', '');          // Default XAMPP MySQL password (blank)
define('DB_NAME', 'mho_db');

try {
    // Connect to MySQL using PDO with error reporting enabled
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    // Stop execution if the database fails to connect
    die("Database Connection Error: " . $e->getMessage());
}

// Start PHP session globally across all pages
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Security Guard Function
 * Ensures the logged-in user has authorization to view the page.
 *
 * @param array $allowed_roles Array of authorized roles e.g. ['STAFF', 'MHO_ADMIN']
 */
function check_access(array $allowed_roles): void {
    if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], $allowed_roles, true)) {
        http_response_code(403);
        die("<div style='font-family:sans-serif; padding:20px; border:1px solid #f5c6cb; background:#f8d7da; color:#721c24; margin:50px auto; max-width:500px; border-radius:5px;'>
            <h3>403 Forbidden - Access Denied</h3>
            <p>You do not have permission to access this portal page.</p>
            <a href='/mho_portal/auth/login.php'>Return to Login</a>
            </div>");
    }
}
?>