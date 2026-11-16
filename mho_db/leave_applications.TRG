TYPE=TRIGGERS
triggers='CREATE DEFINER=`root`@`localhost` TRIGGER trg_after_leave_status_update\nAFTER UPDATE ON leave_applications\nFOR EACH ROW\nBEGIN\n    -- Only log when the application status changes\n    IF OLD.status <> NEW.status THEN\n        INSERT INTO audit_logs (user_id, action_type, description, ip_address)\n        VALUES (\n            NEW.user_id,\n            CONCAT(\'LEAVE_\', NEW.status),\n            CONCAT(\'Leave Application #\', NEW.id, \' (\', NEW.leave_type, \' - \', NEW.total_days, \' days) status changed from \', OLD.status, \' to \', NEW.status, \'.\'),\n            \'127.0.0.1\'\n        );\n    END IF;\nEND'
sql_modes=1098907648
definers='root@localhost'
client_cs_names='utf8mb4'
connection_cl_names='utf8mb4_unicode_ci'
db_cl_names='utf8mb4_unicode_ci'
created=1788796575628029
