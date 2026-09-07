<?php
// reports/audit_logs.php - Audit Trail & Operational Analytics
require_once __DIR__ . '/../config/db.php';

// Access Control: Only MHO_ADMIN, MHO_HEAD, and LGU_HR are authorized
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'])) {
    header('Location: ../dashboard.php');
    exit();
}

// Fetch aggregate statistics for MHO leadership
$total_approved = (int)$pdo->query("SELECT COUNT(*) FROM leave_applications WHERE status = 'APPROVED'")->fetchColumn();
$total_pending  = (int)$pdo->query("SELECT COUNT(*) FROM leave_applications WHERE status = 'PENDING'")->fetchColumn();
$total_rejected = (int)$pdo->query("SELECT COUNT(*) FROM leave_applications WHERE status = 'REJECTED'")->fetchColumn();

// Fetch historical audit logs with user details
$stmt_logs = $pdo->prepare("
    SELECT al.action_type, al.description, al.ip_address, al.created_at, u.full_name, u.role
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
    ORDER BY al.id DESC LIMIT 50
");
$stmt_logs->execute();
$logs = $stmt_logs->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Logs & Analytics - MHO DSS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold" href="../dashboard.php">MHO Portal DSS</a>
        <a href="../dashboard.php" class="btn btn-outline-light btn-sm">Back to Dashboard</a>
    </div>
</nav>

<div class="container pb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold mb-0">System Audit Logs & Operational Analytics</h4>
            <p class="text-muted small mb-0">Municipal Health Office of Manolo Fortich - Administrative Reports</p>
        </div>
        <button onclick="window.print()" class="btn btn-outline-primary btn-sm fw-semibold">Print Summary Report</button>
    </div>

    <!-- Analytics Summary Cards -->
    <div class="row g-3 mb-4">
        <div class="col-md-4">
            <div class="card border-0 shadow-sm border-start border-4 border-success">
                <div class="card-body py-3">
                    <span class="text-muted small fw-bold">TOTAL APPROVED LEAVES</span>
                    <h3 class="fw-bold text-success mb-0"><?= $total_approved ?></h3>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card border-0 shadow-sm border-start border-4 border-warning">
                <div class="card-body py-3">
                    <span class="text-muted small fw-bold">PENDING APPLICATIONS</span>
                    <h3 class="fw-bold text-warning mb-0"><?= $total_pending ?></h3>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card border-0 shadow-sm border-start border-4 border-danger">
                <div class="card-body py-3">
                    <span class="text-muted small fw-bold">REJECTED APPLICATIONS</span>
                    <h3 class="fw-bold text-danger mb-0"><?= $total_rejected ?></h3>
                </div>
            </div>
        </div>
    </div>

    <!-- Audit Trail Table -->
    <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-bold py-3">System Activity & Transaction Trail</div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover mb-0 align-middle">
                    <thead class="table-light">
                        <tr class="small">
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Action Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($logs)): ?>
                            <tr>
                                <td colspan="5" class="text-center text-muted py-4 small">No system activity logged yet. Action logging starts upon leave processing.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($logs as $log): ?>
                                <tr>
                                    <td class="small text-muted"><?= htmlspecialchars($log['created_at']) ?></td>
                                    <td class="fw-semibold small"><?= htmlspecialchars($log['full_name']) ?></td>
                                    <td><span class="badge bg-secondary"><?= htmlspecialchars($log['role']) ?></span></td>
                                    <td><span class="badge bg-info text-dark"><?= htmlspecialchars($log['action_type']) ?></span></td>
                                    <td class="small"><?= htmlspecialchars($log['description']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

</body>
</html>