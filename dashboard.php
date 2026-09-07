<?php
// dashboard.php - Role-Based Dashboard & Portal Hub
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/engine/dss.php';

// Enforce authentication
if (!isset($_SESSION['user_id'])) {
    header('Location: auth/login.php');
    exit();
}

$user_id   = $_SESSION['user_id'];
$full_name = $_SESSION['full_name'];
$role      = $_SESSION['role'];
$position  = $_SESSION['position'];

// Fetch user's current leave balances
$stmt_balance = $pdo->prepare("SELECT vacation_credits, sick_credits FROM leave_balances WHERE user_id = ?");
$stmt_balance->execute([$user_id]);
$balance = $stmt_balance->fetch() ?: ['vacation_credits' => 0, 'sick_credits' => 0];

// Fetch recent leave applications for the user
$stmt_leaves = $pdo->prepare("SELECT leave_type, start_date, end_date, total_days, status FROM leave_applications WHERE user_id = ? ORDER BY id DESC LIMIT 5");
$stmt_leaves->execute([$user_id]);
$recent_leaves = $stmt_leaves->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - MHO Manolo Fortich DSS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<!-- Top Navigation Bar -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="#">MHO Portal DSS</a>
        <div class="d-flex align-items-center text-white ms-auto">
            <span class="me-3 small">Logged in as: <strong><?= htmlspecialchars($full_name) ?></strong> (<?= htmlspecialchars($role) ?>)</span>
            <a href="auth/logout.php" class="btn btn-outline-light btn-sm fw-semibold">Sign Out</a>
        </div>
    </div>
</nav>

<div class="container py-4">
    <!-- Welcome Header -->
    <div class="row mb-4">
        <div class="col-12">
            <div class="card border-0 shadow-sm p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="fw-bold mb-1">Welcome, <?= htmlspecialchars($full_name) ?>!</h4>
                        <p class="text-muted mb-0 small">Position: <?= htmlspecialchars($position) ?> | Municipal Health Office of Manolo Fortich</p>
                    </div>
                    <span class="badge bg-secondary p-2"><?= htmlspecialchars($role) ?> ROLE</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Summary Widgets -->
    <div class="row g-3 mb-4">
        <div class="col-md-6">
            <div class="card border-0 shadow-sm border-start border-4 border-primary">
                <div class="card-body">
                    <h6 class="text-muted small fw-bold">VACATION LEAVE CREDITS</h6>
                    <h3 class="fw-bold text-primary mb-0"><?= number_format($balance['vacation_credits'], 1) ?> <span class="fs-6 text-muted">Days</span></h3>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card border-0 shadow-sm border-start border-4 border-success">
                <div class="card-body">
                    <h6 class="text-muted small fw-bold">SICK LEAVE CREDITS</h6>
                    <h3 class="fw-bold text-success mb-0"><?= number_format($balance['sick_credits'], 1) ?> <span class="fs-6 text-muted">Days</span></h3>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div class="row g-3">
        <!-- Quick Actions & Navigation -->
        <div class="col-md-4">
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-header bg-white fw-bold">System Actions</div>
                <div class="list-group list-group-flush">
                    <a href="leaves/apply.php" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center fw-semibold text-primary">
                        Apply for Leave
                        <span class="badge bg-primary rounded-pill">+</span>
                    </a>
                    <?php if (in_array($role, ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'])): ?>
                    <a href="leaves/approval_queue.php" class="list-group-item list-group-item-action text-danger fw-semibold">
                        Leave Approval Queue (DSS Engine)
                    </a>
                    <a href="reports/audit_logs.php" class="list-group-item list-group-item-action text-secondary fw-semibold">
                        Audit Logs & Analytics
                    </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Recent Leave History -->
        <div class="col-md-8">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white fw-bold">My Recent Leave Applications</div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="table-light">
                                <tr class="small">
                                    <th>Type</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Days</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($recent_leaves)): ?>
                                    <tr>
                                        <td colspan="5" class="text-center text-muted py-3 small">No recent leave records found.</td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($recent_leaves as $leave): ?>
                                        <tr>
                                            <td><?= htmlspecialchars($leave['leave_type']) ?></td>
                                            <td><?= htmlspecialchars($leave['start_date']) ?></td>
                                            <td><?= htmlspecialchars($leave['end_date']) ?></td>
                                            <td><?= htmlspecialchars($leave['total_days']) ?></td>
                                            <td>
                                                <?php
                                                    $badge = match($leave['status']) {
                                                        'APPROVED' => 'bg-success',
                                                        'REJECTED' => 'bg-danger',
                                                        default    => 'bg-warning text-dark'
                                                    };
                                                ?>
                                                <span class="badge <?= $badge ?>"><?= htmlspecialchars($leave['status']) ?></span>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>