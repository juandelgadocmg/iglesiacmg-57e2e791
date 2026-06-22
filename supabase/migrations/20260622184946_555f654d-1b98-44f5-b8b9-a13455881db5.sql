
ALTER TABLE public.sem_inscripciones DISABLE TRIGGER trg_sem_set_periodo_ingreso;

WITH 
periodo_map(acad_periodo_id, sem_periodo_id, anio) AS (
  VALUES
    ('00989dd8-b643-43e1-ad0e-cdda035832c9'::uuid, '4302b6a4-d489-4fc1-85d8-544ca7d9dede'::uuid, 2022),
    ('c9083ece-12b6-4062-9957-52c5f2ead035'::uuid, '3f145f00-a864-41a4-8dbf-24f562d77033'::uuid, 2023),
    ('f3d47921-a121-49c7-9db5-f2c1098f507a'::uuid, 'ef449409-89fd-464d-833b-4e66a3b8f120'::uuid, 2024),
    ('bfe19bce-6aa3-4c3c-8bcf-6290d5603c1c'::uuid, 'c5900366-0125-4df8-87d1-de2e3e121df5'::uuid, 2025)
),
norm_mat_acad AS (
  SELECT id AS materia_acad_id,
         btrim(regexp_replace(lower(translate(coalesce(nombre,''), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')), '\.', '', 'g')) AS k
  FROM public.materias
),
norm_mat_sem AS (
  SELECT DISTINCT ON (k) id AS materia_sem_id, k FROM (
    SELECT id, codigo,
      btrim(regexp_replace(lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')), '\.', '', 'g')) AS k
    FROM public.sem_materias
  ) s
  ORDER BY k, (codigo LIKE 'TBM-%') ASC, codigo
),
mat_map AS (
  SELECT a.materia_acad_id,
         COALESCE(s.materia_sem_id, s2.materia_sem_id) AS materia_sem_id
  FROM norm_mat_acad a
  LEFT JOIN norm_mat_sem s  ON s.k = a.k
  LEFT JOIN norm_mat_sem s2 ON s2.k = a.k || ' i'
),
src AS (
  SELECT 
    m.persona_id,
    pm.sem_periodo_id,
    pm.anio,
    mm.materia_sem_id,
    m.nota_final,
    m.estado AS estado_acad
  FROM public.matriculas m
  JOIN periodo_map pm ON pm.acad_periodo_id = m.periodo_id
  JOIN mat_map mm ON mm.materia_acad_id = m.materia_id
  WHERE mm.materia_sem_id IS NOT NULL
),
ins_ofertas AS (
  INSERT INTO public.sem_ofertas (periodo_id, materia_id, modalidad, estado)
  SELECT DISTINCT sem_periodo_id, materia_sem_id, 'presencial', 'cerrada'
  FROM src
  ON CONFLICT (periodo_id, materia_id) DO NOTHING
  RETURNING id, periodo_id, materia_id
),
all_ofertas AS (
  SELECT id, periodo_id, materia_id FROM ins_ofertas
  UNION
  SELECT o.id, o.periodo_id, o.materia_id
  FROM public.sem_ofertas o
  JOIN (SELECT DISTINCT sem_periodo_id, materia_sem_id FROM src) s
    ON s.sem_periodo_id = o.periodo_id AND s.materia_sem_id = o.materia_id
),
ins_insc AS (
  INSERT INTO public.sem_inscripciones (persona_id, programa_id, periodo_id, estado, periodo_ingreso_id, anio_ingreso)
  SELECT DISTINCT s.persona_id,
                  '27666396-0a8e-47a5-9cf9-b10c46abd95a'::uuid,
                  s.sem_periodo_id,
                  'activa',
                  s.sem_periodo_id,
                  s.anio
  FROM src s
  ON CONFLICT (persona_id, periodo_id) DO NOTHING
  RETURNING id, persona_id, periodo_id
),
all_insc AS (
  SELECT id, persona_id, periodo_id FROM ins_insc
  UNION
  SELECT i.id, i.persona_id, i.periodo_id
  FROM public.sem_inscripciones i
  JOIN (SELECT DISTINCT persona_id, sem_periodo_id FROM src) s
    ON s.persona_id = i.persona_id AND s.sem_periodo_id = i.periodo_id
)
INSERT INTO public.sem_inscripcion_materias (inscripcion_id, oferta_id, materia_id, nota_final, estado)
SELECT i.id, o.id, s.materia_sem_id,
       CASE WHEN s.nota_final IS NULL THEN NULL ELSE round(s.nota_final::numeric, 2) END,
       CASE s.estado_acad
         WHEN 'Aprobó'     THEN 'aprobada'
         WHEN 'Completado' THEN 'aprobada'
         WHEN 'No Aprobó'  THEN 'reprobada'
         WHEN 'Retirado'   THEN 'cancelada'
         WHEN 'Activo'     THEN 'cursando'
         ELSE 'cursando'
       END
FROM src s
JOIN all_insc i    ON i.persona_id = s.persona_id AND i.periodo_id = s.sem_periodo_id
JOIN all_ofertas o ON o.periodo_id = s.sem_periodo_id AND o.materia_id = s.materia_sem_id
ON CONFLICT (inscripcion_id, oferta_id) DO NOTHING;

-- Recalcular periodo/año de ingreso usando el periodo más antiguo por (persona, programa)
UPDATE public.sem_inscripciones tgt
SET periodo_ingreso_id = sub.first_periodo_id,
    anio_ingreso       = sub.first_anio
FROM (
  SELECT DISTINCT ON (i.persona_id, i.programa_id)
    i.persona_id, i.programa_id,
    i.periodo_id AS first_periodo_id,
    EXTRACT(YEAR FROM p.fecha_inicio)::int AS first_anio
  FROM public.sem_inscripciones i
  JOIN public.sem_periodos p ON p.id = i.periodo_id
  ORDER BY i.persona_id, i.programa_id, p.fecha_inicio ASC NULLS LAST, i.created_at ASC
) sub
WHERE tgt.persona_id = sub.persona_id
  AND tgt.programa_id = sub.programa_id
  AND (tgt.periodo_ingreso_id IS DISTINCT FROM sub.first_periodo_id
       OR tgt.anio_ingreso     IS DISTINCT FROM sub.first_anio);

ALTER TABLE public.sem_inscripciones ENABLE TRIGGER trg_sem_set_periodo_ingreso;
