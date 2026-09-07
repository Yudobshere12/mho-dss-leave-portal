<?php
// engine/dss.php - Rule-Based Decision Support System Engine
require_once __DIR__ . '/../config/db.php';

/**
 * Evaluates leave credit adequacy.
 */
function evaluate_leave_credits(PDO $pdo, int $user_id, string $leave_type, float $requested_days): array {
    $stmt = $pdo->prepare("SELECT vacation_credits, sick_credits FROM leave_balances WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $balance = $stmt->fetch();

    if (!$balance) {
        return [
            'passed' => false,
            'message' => 'No leave balance record found for this employee.',
            'available' => 0
        ];
    }

    $available = ($leave_type === 'Vacation') ? (float)$balance['vacation_credits'] : (float)$balance['sick_credits'];

    if ($available >= $requested_days) {
        return [
            'passed' => true,
            'message' => "Sufficient {$leave_type} leave balance available ({$available} days remaining).",
            'available' => $available
        ];
    } else {
        return [
            'passed' => false,
            'message' => "Insufficient {$leave_type} leave balance. Requested: {$requested_days} days, Available: {$available} days.",
            'available' => $available
        ];
    }
}

/**
 * Evaluates schedule conflicts and minimum staff coverage during requested leave dates.
 */
function evaluate_schedule_conflict(PDO $pdo, int $user_id, string $start_date, string $end_date, int $min_required_staff = 2): array {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM leave_applications 
        WHERE user_id = ? 
          AND status = 'APPROVED' 
          AND (start_date <= ? AND end_date >= ?)
    ");
    $stmt->execute([$user_id, $end_date, $start_date]);
    if ($stmt->fetchColumn() > 0) {
        return [
            'passed' => false,
            'warning' => true,
            'message' => 'User already has an approved leave application during this period.'
        ];
    }

    $stmt_overlap = $pdo->prepare("
        SELECT COUNT(DISTINCT user_id) FROM leave_applications 
        WHERE user_id != ? 
          AND status = 'APPROVED' 
          AND (start_date <= ? AND end_date >= ?)
    ");
    $stmt_overlap->execute([$user_id, $end_date, $start_date]);
    $overlapping_leaves = (int)$stmt_overlap->fetchColumn();

    $total_staff = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'STAFF'")->fetchColumn();
    $projected_available_staff = $total_staff - $overlapping_leaves - 1;

    if ($projected_available_staff < $min_required_staff) {
        return [
            'passed' => true,
            'warning' => true,
            'message' => "Coverage Warning: Approving this leave reduces duty staff to {$projected_available_staff} (Minimum threshold: {$min_required_staff})."
        ];
    }

    return [
        'passed' => true,
        'warning' => false,
        'message' => "Schedule check passed. Projected available duty staff: {$projected_available_staff}."
    ];
}

/**
 * Master DSS Function combining credit checks and conflict flags.
 */
function dss_evaluate_application(PDO $pdo, int $user_id, string $leave_type, float $days, string $start_date, string $end_date): array {
    $credit_eval = evaluate_leave_credits($pdo, $user_id, $leave_type, $days);
    $schedule_eval = evaluate_schedule_conflict($pdo, $user_id, $start_date, $end_date);

    $overall_recommendation = ($credit_eval['passed'] && !$schedule_eval['warning']) ? 'RECOMMENDED' : 'NEEDS_REVIEW';

    return [
        'recommendation' => $overall_recommendation,
        'credit_check'   => $credit_eval,
        'schedule_check' => $schedule_eval
    ];
}
?>