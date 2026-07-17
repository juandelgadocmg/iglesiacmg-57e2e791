ALTER TABLE public.security_audit_log DROP CONSTRAINT security_audit_log_operation_check;
ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_operation_check
CHECK (operation = ANY (ARRAY[
  'INSERT','UPDATE','DELETE',
  'CDP_REPORT_CREATED','CDP_PLAN_CREATED','CDP_ACTION',
  'CHECKIN','ATTENDANCE_MARK','EXPORT_FICHA','EXPORT_HISTORIAL',
  'CERTIFICATE_ISSUED','PROFILE_QUICK_ACTION','LOAD_FAILURE'
]));