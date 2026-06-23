
-- Audit log for prog changes
CREATE TABLE public.prog_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid REFERENCES public.prog_eventos(id) ON DELETE CASCADE,
  asignacion_id uuid,
  actor_user_id uuid,
  actor_nombre text,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.prog_audit_log TO authenticated;
GRANT ALL ON public.prog_audit_log TO service_role;
ALTER TABLE public.prog_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read prog_audit" ON public.prog_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert prog_audit" ON public.prog_audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_prog_audit_evento ON public.prog_audit_log(evento_id, created_at DESC);

-- Replacement workflow
CREATE TABLE public.prog_reemplazos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asignacion_id uuid NOT NULL REFERENCES public.prog_asignaciones(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.prog_eventos(id) ON DELETE CASCADE,
  ministerio_id uuid,
  cargo_id uuid,
  persona_solicita_id uuid NOT NULL,
  persona_reemplazo_id uuid,
  motivo text,
  estado text NOT NULL DEFAULT 'pendiente',  -- pendiente|aprobado|rechazado|reasignado_auto
  aprobado_por uuid,
  aprobado_at timestamptz,
  notas_aprobacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prog_reemplazos TO authenticated;
GRANT ALL ON public.prog_reemplazos TO service_role;
ALTER TABLE public.prog_reemplazos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage prog_reemplazos" ON public.prog_reemplazos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER prog_reemplazos_upd BEFORE UPDATE ON public.prog_reemplazos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add cutoff column and reminder tracking to eventos
ALTER TABLE public.prog_eventos ADD COLUMN IF NOT EXISTS bloqueo_at timestamptz;
ALTER TABLE public.prog_eventos ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz;
ALTER TABLE public.prog_eventos ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;

-- Function to compute event timestamp
CREATE OR REPLACE FUNCTION public.prog_evento_ts(_fecha date, _hora text)
RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
  SELECT (
    _fecha::text || ' ' || COALESCE(NULLIF(regexp_replace(_hora, '[^0-9:]', '', 'g'), ''), '09:00')
  )::timestamptz
$$;

-- Reminder processor
CREATE OR REPLACE FUNCTION public.prog_send_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD; v_uids uuid[]; v_count int := 0; v_ts timestamptz; v_diff interval;
BEGIN
  FOR r IN
    SELECT * FROM public.prog_eventos
    WHERE estado = 'publicado'
      AND fecha >= (now() at time zone 'UTC')::date - INTERVAL '1 day'
      AND fecha <= (now() at time zone 'UTC')::date + INTERVAL '2 day'
  LOOP
    v_ts := public.prog_evento_ts(r.fecha, r.hora);
    v_diff := v_ts - now();
    -- 24h reminder
    IF v_diff <= INTERVAL '24 hours' AND v_diff > INTERVAL '2 hours' AND r.reminder_24h_sent_at IS NULL THEN
      SELECT ARRAY_AGG(DISTINCT p.user_id) INTO v_uids
        FROM public.prog_asignaciones a
        JOIN public.personas p ON p.id = a.persona_id
        WHERE a.evento_id = r.id AND p.user_id IS NOT NULL;
      IF v_uids IS NOT NULL THEN
        PERFORM public.msg_send_system('coordinacion_academica', v_uids,
          '⏰ Recordatorio: ' || r.titulo || ' en 24 horas',
          'Recuerda que has sido programado para servir el ' || r.fecha::text || COALESCE(' a las ' || r.hora, '') || '.\nPor favor confirma tu asistencia o solicita reemplazo desde Reuniones → Programación.');
      END IF;
      UPDATE public.prog_eventos SET reminder_24h_sent_at = now() WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
    -- 2h reminder
    IF v_diff <= INTERVAL '2 hours' AND v_diff > INTERVAL '0' AND r.reminder_2h_sent_at IS NULL THEN
      SELECT ARRAY_AGG(DISTINCT p.user_id) INTO v_uids
        FROM public.prog_asignaciones a
        JOIN public.personas p ON p.id = a.persona_id
        WHERE a.evento_id = r.id AND p.user_id IS NOT NULL;
      IF v_uids IS NOT NULL THEN
        PERFORM public.msg_send_system('coordinacion_academica', v_uids,
          '🔔 ¡Tu servicio inicia pronto! ' || r.titulo,
          'Tu servicio empieza en aproximadamente 2 horas. Lugar: ' || COALESCE(r.lugar,'—') || '. ¡Te esperamos!');
      END IF;
      UPDATE public.prog_eventos SET reminder_2h_sent_at = now() WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;

-- Schedule reminders every 15 minutes
SELECT cron.schedule('prog_send_reminders_every_15m', '*/15 * * * *', $$SELECT public.prog_send_reminders();$$);
