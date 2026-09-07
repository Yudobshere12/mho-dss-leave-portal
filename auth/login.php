<?php
// auth/login.php - Authentication Entry Point
require_once __DIR__ . '/../config/db.php';

// Redirect to dashboard if session already exists
if (isset($_SESSION['user_id'])) {
    header('Location: ../dashboard.php');
    exit();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (!empty($email) && !empty($password)) {
        // Query user with PDO prepared statements
        $stmt = $pdo->prepare("SELECT id, full_name, email, password, role, position FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Verify hash against submitted password
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role']      = $user['role'];
            $_SESSION['position']  = $user['position'];

            header('Location: ../dashboard.php');
            exit();
        } else {
            $error = "Invalid email address or password.";
        }
    } else {
        $error = "Please fill in all required fields.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - MHO Manolo Fortich DSS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light d-flex align-items-center vh-100">
<div class="container">
    <div class="row justify-content-center">
        <div class="col-md-4">
            <div class="card shadow-sm border-0">
                <div class="card-body p-4">
                    <div class="text-center mb-4">
                        <h4 class="fw-bold text-primary mb-1">MHO Portal</h4>
                        <p class="text-muted small">Employee Information & Decision Support System</p>
                    </div>
                    
                    <?php if (!empty($error)): ?>
                        <div class="alert alert-danger py-2 small" role="alert">
                            <?= htmlspecialchars($error) ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" action="">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Email Address</label>
                            <input type="email" name="email" class="form-control" required placeholder="name@mho.gov.ph">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Password</label>
                            <input type="password" name="password" class="form-control" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn btn-primary w-100 fw-semibold">Sign In</button>
                    </form>
                </div>
            </div>
            <div class="text-center mt-3">
                <small class="text-muted">Municipal Health Office - Manolo Fortich</small>
            </div>
        </div>
    </div>
</div>
</body>
</html>