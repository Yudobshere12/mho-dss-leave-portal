<?php
// leaves/approval_queue.php - DSS Leave Decision & Approval Interface
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../engine/dss.php';

// Access Control: Only MHO_ADMIN, MHO_HEAD, and LGU_HR are authorized
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'])) {
    header('Location: ../dashboard.php');
    exit();
}

$message = '';
$message_type = '';

// Handle Approval / Rejection Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'], $_POST['application_id'])) {
    $app_id = (int)$_POST['application_id'];
    $action = $_POST['action']; // 'APPROVE' or 'REJECT'

    // Fetch application details
    $stmt = $pdo->prepare("SELECT user_id, leave_type, total_days, status FROM leave_applications WHERE id = ?");
    $stmt->execute([$app_id]);
    $app = $stmt->fetch();

    if ($app && $app['status'] === 'PENDING') {
        if ($action === 'APPROVE') {
            // Deduct credits from user's balance upon approval
            $column = ($app['leave_type'] === 'Vacation') ? 'vacation_credits' : 'sick_credits';
            
            $pdo->beginTransaction();
            try {
                // Update leave balance
                $update_bal = $pdo->prepare("UPDATE leave_balances SET {$column} = {$column} - ? WHERE user_id = ?");
                $update_bal->execute([$app['total_days'], $app['user_id']]);

                // Update application status
                $update_app = $pdo->prepare("UPDATE leave_applications SET status = 'APPROVED' WHERE id = ?");
                $update_app->execute([$app_id]);

                $pdo->commit();
                $message = "Application #{$app_id} successfully APPROVED. Leave balances updated.";
                $message_type = "success";
            } catch (Exception $e) {
                $pdo->rollBack();
                $message = "Error processing approval: " . $e->getMessage();
                $message_type = "danger";
            }
        } elseif ($action === 'REJECT') {
            $update_app = $pdo->prepare("UPDATE leave_applications SET status = 'REJECTED' WHERE id = ?");
            $update_app->execute([$app_id]);
            $message = "Application #{$app_id} marked as REJECTED.";
            $message_type = "info";
        }
    }
}

// Fetch all pending applications with applicant details
$stmt_pending = $pdo->prepare("
    SELECT la.id, la.user_id, la.leave_type, la.start_date, la.end_date, la.total_days, la.reason, la.created_at,
           u.full_name, u.position
    FROM leave_applications la
    JOIN users u ON la.user_id = u.id
    WHERE la.status = 'PENDING'
    ORDER BY la.created_at ASC
");
$stmt_pending->execute();
$pending_apps = $stmt_pending->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leave Approval Queue - MHO DSS</title>
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
    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <h4 class="fw-bold mb-0">Leave Approval Queue</h4>
            <p class="text-muted small mb-0">Decision Support System evaluation & administrative review</p>
        </div>
        <span class="badge bg-primary fs-6"><?= count($pending_apps) ?> Pending</span>
    </div>

    <?php if (!empty($message)): ?>
        <div class="alert alert-<?= $message_type ?> alert-dismissible fade show small" role="alert">
            <?= htmlspecialchars($message) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <?php if (empty($pending_apps)): ?>
        <div class="card border-0 shadow-sm p-5 text-center">
            <h5 class="text-muted">No pending leave applications.</h5>
            <p class="small text-muted mb-0">All submitted applications have been evaluated and processed.</p>
        </div>
    <?php else: ?>
        <div class="row g-3">
            <?php foreach ($pending_apps as $app): 
                // Run real-time DSS evaluation for each application
                $dss = dss_evaluate_application(
                    $pdo, 
                    (int)$app['user_id'], 
                    $app['leave_type'], 
                    (float)$app['total_days'], 
                    $app['start_date'], 
                    $app['end_date']
                );
            ?>
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <div class="row align-items-center">
                                <!-- Employee & Request Details -->
                                <div class="col-md-4 border-end">
                                    <span class="badge bg-secondary mb-2"><?= htmlspecialchars($app['leave_type']) ?> LEAVE</span>
                                    <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($app['full_name']) ?></h5>
                                    <p class="text-muted small mb-2"><?= htmlspecialchars($app['position']) ?></p>
                                    <div class="small">
                                        <strong>Dates:</strong> <?= $app['start_date'] ?> to <?= $app['end_date'] ?><br>
                                        <strong>Duration:</strong> <?= $app['total_days'] ?> day(s)<br>
                                        <strong>Reason:</strong> <em>"<?= htmlspecialchars($app['reason']) ?>"</em>
                                    </div>
                                </div>

                                <!-- DSS Evaluation Panel -->
                                <div class="col-md-5 border-end">
                                    <h6 class="fw-bold text-uppercase text-muted small mb-2">DSS Recommendation Engine</h6>
                                    
                                    <?php if ($dss['recommendation'] === 'RECOMMENDED'): ?>
                                        <div class="badge bg-success mb-2 px-3 py-2">RECOMMENDED FOR APPROVAL</div>
                                    <?php else: ?>
                                        <div class="badge bg-warning text-dark mb-2 px-3 py-2">NEEDS REVIEW / CAUTION</div>
                                    <?php endif; ?>

                                    <div class="small mt-1">
                                        <div class="text-<?= $dss['credit_check']['passed'] ? 'success' : 'danger' ?> fw-semibold">
                                            • <?= htmlspecialchars($dss['credit_check']['message']) ?>
                                        </div>
                                        <div class="text-<?= $dss['schedule_check']['warning'] ? 'warning' : 'muted' ?> fw-semibold">
                                            • <?= htmlspecialchars($dss['schedule_check']['message']) ?>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="col-md-3 text-center">
                                    <form method="POST" action="">
                                        <input type="hidden" name="application_id" value="<?= $app['id'] ?>">
                                        
                                        <button type="submit" name="action" value="APPROVE" class="btn btn-success w-100 fw-semibold mb-2" onclick="return confirm('Approve this leave application? Credits will be deducted.');">
                                            Approve Leave
                                        </button>
                                        
                                        <button type="submit" name="action" value="REJECT" class="btn btn-outline-danger w-100 fw-semibold btn-sm" onclick="return confirm('Reject this leave application?');">
                                            Reject
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<script href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>