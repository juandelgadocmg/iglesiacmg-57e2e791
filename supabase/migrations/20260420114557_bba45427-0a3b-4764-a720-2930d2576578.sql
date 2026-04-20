-- 1. Función de sincronización
CREATE OR REPLACE FUNCTION public.sync_grupo_miembros_from_persona()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INSERT: solo agregar si tiene grupo
  IF TG_OP = 'INSERT' THEN
    IF NEW.grupo_id IS NOT NULL THEN
      INSERT INTO public.grupo_miembros (grupo_id, persona_id, rol)
      VALUES (NEW.grupo_id, NEW.id, 'asistente')
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: si cambió el grupo
  IF TG_OP = 'UPDATE' THEN
    IF NEW.grupo_id IS DISTINCT FROM OLD.grupo_id THEN
      -- Eliminar membresía vieja
      IF OLD.grupo_id IS NOT NULL THEN
        DELETE FROM public.grupo_miembros
        WHERE persona_id = NEW.id AND grupo_id = OLD.grupo_id;
      END IF;
      -- Crear nueva
      IF NEW.grupo_id IS NOT NULL THEN
        INSERT INTO public.grupo_miembros (grupo_id, persona_id, rol)
        VALUES (NEW.grupo_id, NEW.id, 'asistente')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Índice único para soportar ON CONFLICT y evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS grupo_miembros_grupo_persona_unique
  ON public.grupo_miembros (grupo_id, persona_id);

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_sync_grupo_miembros ON public.personas;
CREATE TRIGGER trg_sync_grupo_miembros
AFTER INSERT OR UPDATE OF grupo_id ON public.personas
FOR EACH ROW
EXECUTE FUNCTION public.sync_grupo_miembros_from_persona();

-- 4. Backfill: insertar membresías faltantes para personas con grupo_id
INSERT INTO public.grupo_miembros (grupo_id, persona_id, rol)
SELECT p.grupo_id, p.id, 'asistente'
FROM public.personas p
WHERE p.grupo_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.grupo_miembros gm
    WHERE gm.persona_id = p.id AND gm.grupo_id = p.grupo_id
  )
ON CONFLICT DO NOTHING;