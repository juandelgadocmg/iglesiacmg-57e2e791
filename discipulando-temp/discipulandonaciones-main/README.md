# Discipulado Conectado

Crea una aplicación web full-stack llamada “Disicipulando Naciones” para hacer seguimiento durante todo el año a cada discípulo y ver actualizaciones en tiempo real, incluyendo metas mensuales y un semáforo de estado.

STACK / REQUISITOS

- Usa Supabase (Auth + DB Postgres + Realtime).

- Frontend en Next.js con UI limpia y responsive (mobile primero).

- Todo el texto en español.

- Realtime: Dashboard y Perfil del discípulo se actualizan al instante (subscriptions a Supabase Realtime).

- Roles: ADMIN y LIDER.

  - ADMIN ve y edita todo.

  - LIDER solo ve y edita discípulos asignados.

- Seguridad: Row Level Security (RLS) + políticas por rol.

MODELO DE DATOS (TABLAS)

1) leaders

- id (uuid, pk)  // debe coincidir con auth.users.id

- full_name (text)

- phone (text, opcional)

- email (text, opcional)

- role (text: 'ADMIN' | 'LIDER')

- created_at, updated_at

2) casas_de_paz

- id (uuid, pk)

- name (text)

- city (text, opcional)

- created_at, updated_at

3) discipulos

- id (uuid, pk)

- full_name (text)

- casa_de_paz_id (fk -> casas_de_paz.id)

- lider_id (fk -> leaders.id)

- status (text: 'Activo' | 'En pausa' | 'Completado')

- start_date (date, opcional)

- notes (text, opcional)

- last_update_at (timestamp) // se actualiza al crear seguimiento o cambiar etapa

- created_at, updated_at

4) etapas_discipulado (catálogo)

- code (text, pk)

- label (text)

- order_num (int)

Insertar estas etapas:

- NPT  = “Nací para triunfar”

- TSDP = “Tres semanas de poder”

- NVNC = “Nueva vida y nuevo comienzo”

- RSI  = “Retiro de sanidad interior y liberación”

- DNC  = “Discipulado de nuevo creyente”

- ES   = “Escuela de evangelismo”

- LCP  = “Líderes de casas de paz”

- RLCP = “Retiro de líderes de casas de paz”

5) progreso_discipulo

- id (uuid, pk)

- discipulo_id (fk -> discipulos.id)

- etapa_code (fk -> etapas_discipulado.code)

- completed (boolean)

- completed_at (timestamp, opcional)

- updated_by (fk -> leaders.id)

- updated_at

6) seguimientos

- id (uuid, pk)

- discipulo_id (fk -> discipulos.id)

- fecha (date)

- resumen (text)

- asistencia (text, opcional)

- peticiones_oracion (text, opcional)

- proximos_pasos (text, opcional)

- created_by (fk -> leaders.id)

- created_at

NUEVO: METAS POR MES

7) metas_mensuales

- id (uuid, pk)

- month_key (date) // guardar siempre el primer día del mes (ej: 2026-03-01)

- scope_type (text: 'GLOBAL' | 'LIDER' | 'CASA' | 'DISCIPULO')

- lider_id (uuid, opcional)      // requerido si scope_type='LIDER'

- casa_de_paz_id (uuid, opcional)// requerido si scope_type='CASA'

- discipulo_id (uuid, opcional)  // requerido si scope_type='DISCIPULO'

- meta_seguimientos (int)        // cuántos seguimientos en el mes

- meta_etapas (int)              // cuántas etapas completadas en el mes (total)

- notes (text, opcional)

- created_by (uuid -> leaders.id)

- created_at, updated_at

NUEVO: MÉTRICAS DEL MES (puede ser VIEW o consultas)

- Calcular “real_seguimientos_mes”: count(seguimientos) por discipulo/lider/casa dentro del month_key

- Calcular “real_etapas_mes”: count(progreso_discipulo completed_at) dentro del mes

SEMAFORO (REGLAS)

- Semáforo se calcula por discípulo (y también agregado por líder/casa).

- Definir umbrales (configurables en código, pero por defecto):

  - Verde:

    - last_update_at dentro de los últimos 7 días

    - y cumplimiento de metas del mes >= 75% (seguimientos y/o etapas, según la meta configurada)

  - Amarillo:

    - last_update_at entre 8 y 14 días

    - o cumplimiento entre 40% y 74%

  - Rojo:

    - last_update_at > 14 días o es null

    - o cumplimiento < 40%

- Si el discípulo está “En pausa”, mostrar semáforo “Gris” (no cuenta en alertas), pero se puede filtrar.

- Si “Completado”, semáforo “Azul” y se excluye de pendientes.

PANTALLAS

A) Login (Supabase Auth).

B) Dashboard principal (ADMIN y LIDER)

- Selector de mes (por defecto el mes actual).

- KPIs del mes:

  - Meta de seguimientos vs Real vs % cumplimiento

  - Meta de etapas vs Real vs % cumplimiento

  - # Verde / Amarillo / Rojo

  - # sin actualización en 14 días

- Tabla “Discípulos” con:

  - Semáforo (punto + etiqueta)

  - Nombre, Casa de Paz, Líder, Estado

  - Progreso (chips con etapas completadas)

  - % avance total (completadas/8)

  - Real del mes: seguimientos y etapas

  - Última actualización (last_update_at)

- Filtros: por semáforo, Casa de Paz, Líder, Estado, etapa, “sin seguimiento 14 días”, buscador.

- Todo en tiempo real.

C) Panel “Metas mensuales”

- Crear/editar metas por mes con 4 niveles:

  1) Global (ADMIN)

  2) Por Líder (ADMIN)

  3) Por Casa de Paz (ADMIN o LIDER si se le permite)

  4) Por Discípulo (ADMIN o LIDER si es su discípulo)

- Mostrar tarjetas: meta vs real vs %.

- Mostrar tabla por líder y por casa con semáforo agregado:

  - Verde si >= 75% y sin rojos críticos,

  - Amarillo intermedio,

  - Rojo si muchas alertas o bajo cumplimiento.

D) Vista “Resumen por Líder”

- Lista de líderes con:

  - Total discípulos activos

  - Verde/Amarillo/Rojo

  - Cumplimiento de metas del mes (seguimientos/etapas)

  - Botón “Ver detalle”

E) Perfil del discípulo

- Cabecera con datos.

- Semáforo actual + explicación (“Actualizado hace X días / Cumplimiento del mes Y%”).

- “Metas del mes” (si aplica por DISCIPULO o hereda por LIDER/CASA/GLOBAL).

- “Progreso” checklist de etapas (NPT, TSDP, NVNC, RSI, DNC, ES, LCP, RLCP).

- “Seguimientos” timeline (crear y ver historial).

- Realtime.

F) Importación (opcional)

- Importar CSV con columnas:

  CASA_DE_PAZ, DISCIPULO, LIDER_ENCARGADO, NPT, TSDP, NVNC, RSI, DNC, ES, LCP, RLCP, OBSERVACION

- “SI/TRUE/1” => completed=true.

- Crear casas de paz y líderes si no existen (matching por nombre).

REGLAS / LOGICA

- Cada vez que se cree un seguimiento o se cambie una etapa:

  - actualizar discipulos.last_update_at = now()

- “Sin actualización 14 días”:

  - last_update_at < hoy - 14 días OR last_update_at is null

- Cumplimiento mensual:

  - seguimiento: real_seguimientos_mes / meta_seguimientos

  - etapas: real_etapas_mes / meta_etapas

- Herencia de metas (si no existe meta DISCIPULO):

  1) DISCIPULO

  2) CASA

  3) LIDER

  4) GLOBAL

  (tomar la primera que exista para month_key)

RLS

- ADMIN: acceso total.

- LIDER: solo discipulos donde discipulos.lider_id = auth.user.id

- progreso_discipulo y seguimientos: restringidos por discipulo_id con el mismo criterio.

- metas_mensuales:

  - ADMIN: todas

  - LIDER: puede ver GLOBAL + las suyas (LIDER) + las de sus casas/discipulos (según alcance permitido)

ENTREGABLE

- App funcional, tablas creadas, RLS activo, realtime funcionando, dashboard con metas mensuales y semáforo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://discipulandonaciones.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1c1f96b5-7424-406a-bdef-969453d21edf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
