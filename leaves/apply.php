<?php
// leaves/apply.php - Leave Application Submission Form
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../engine/dss.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: ../auth/login.php');
    exit();
}

$user_id = $_SESSION['user_id'];
$message = '';
$message_type = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $leave_type = $_POST['leave_type'] ?? 'Vacation';
    $start_date = $_POST['start_date'] ?? '';
    $end_date   = $_POST['end_date'] ?? '';
    $reason     = trim($_POST['reason'] ?? '');

    if (!empty($start_date) && !empty($end_date) && !empty($reason)) {
        // Calculate total days (inclusive)
        $start = new DateTime($start_date);
        $end   = new DateTime($end_date);
        
        if ($end < $start) {
            $message = "End date cannot be prior to start date.";
            $message_type = "danger";
        } else {
            $total_days = $start->diff($end)->days + 1;

            // Run Decision Support System evaluation
            $dss_result = dss_evaluate_application($pdo, $user_id, $leave_type, (float)$total_days, $start_date, $end_date);

            if (!$dss_result['credit_check']['passed']) {
                $message = $dss_result['credit_check']['message'];
                $message_type = "danger";
            } else {
                // Save application to database
                $stmt = $pdo->prepare("INSERT INTO leave_applications (user_id, leave_type, start_date, end_date, total_days, reason, status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')");
                $stmt->execute([$user_id, $leave_type, $start_date, $end_date, $total_days, $reason]);

                $message = "Leave application submitted successfully! DSS Status: " . $dss_result['schedule_check']['message'];
                $message_type = $dss_result['schedule_check']['warning'] ? "warning" : "success";
            }
        }
    } else {
        $message = "Please complete all required fields.";
        $message_type = "danger";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apply for Leave - MHO DSS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold" href="../dashboard.php">MHO Portal DSS</a>
        <a href="../dashboard.php" class="btn btn-outline-light btn-sm">Back to Dashboard</a>
    </div>
</nav>

<div class="container">
    <div class="row justify-content-center">
        <div class="col-md-7">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white fw-bold py-3">Submit Leave Application</div>
                <div class="card-body p-4">
                    
                    <?php if (!empty($message)): ?>
                        <div class="alert alert-<?= $message_type ?> small" role="alert">
                            <?= htmlspecialchars($message) ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" action="">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Leave Type</label>
                            <select name="leave_type" class="form-select" required>
                                <option value="Vacation">Vacation Leave</option>
                                <option value="Sick">Sick Leave</option>
                            </select>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Start Date</label>
                                <input type="date" name="start_date" class="form-control" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">End Date</label>
                                <input type="date" name="end_date" class="form-control" required>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">Reason for Leave</label>
                            <textarea name="reason" class="form-control" rows="3" required placeholder="State your reason..."></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary w-100 fw-semibold">Submit Application</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>