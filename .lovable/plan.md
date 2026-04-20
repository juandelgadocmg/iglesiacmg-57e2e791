

## Problema confirmado

Consulté la base de datos:
- **3,367 personas** tienen `grupo_id` asignado
- **70 personas** NO existen en `grupo_miembros` para ese grupo → no aparecen en el panel del grupo

### Causas raíz
1. El panel de miembros (`GrupoMembersPanel`) lee desde `grupo_miembros`, no desde `personas.grupo_id`. Son dos fuentes de verdad sin sincronización garantizada.
2. `PersonaFormDialog` intenta insertar en `grupo_miembros` después de crear/editar, pero:
   - No invalida los query keys `grupo_miembros_detail` ni `grupo_miembros_perfil`, así que la UI muestra cache viejo.
   - Si el insert falla silenciosamente (RLS, race condition), la persona queda huérfana sin alerta clara.
3. Otros flujos (importación masiva, edición rápida, scripts antiguos) escriben directo en `personas.grupo_id` sin tocar `grupo_miembros`.

## Solución: sincronización a nivel de BD + backfill + UI

### 1. Trigger en BD (fuente de verdad única)
Crear un trigger `AFTER INSERT OR UPDATE OF grupo_id ON personas` que automáticamente:
- Si `grupo_id` cambió y el anterior no era null → eliminar fila vieja en `grupo_miembros`
- Si el nuevo `grupo_id` no es null y no existe fila → insertar con `rol = 'asistente'`

Esto cubre TODOS los flujos (formulario, importación masiva, edición rápida, ediciones futuras) sin tocar más código.

### 2. Backfill de los 70 registros desincronizados
Migración que inserta en `grupo_miembros` todas las personas con `grupo_id` que no tienen su fila correspondiente.

### 3. Limpiar e invalidar correctamente en `PersonaFormDialog.tsx`
- Quitar la lógica manual de insert/delete en `grupo_miembros` (el trigger se encarga).
- Agregar `qc.invalidateQueries` para `grupo_miembros_detail`, `grupo_miembros_perfil` y `grupos` después de crear/editar persona.

### 4. Invalidación cruzada en `useCreatePersona` / `useUpdatePersona`
Agregar invalidación de los query keys de miembros para que el panel del grupo se refresque automáticamente al crear/editar desde cualquier parte del sistema.

## Archivos afectados

- **Nueva migración SQL**:
  - Función `sync_grupo_miembros_from_persona()` + trigger en `personas`
  - Backfill de 70 registros huérfanos
- **`src/components/forms/PersonaFormDialog.tsx`**: eliminar lógica manual de `grupo_miembros` (líneas 167–197), conservar solo el insert de la persona.
- **`src/hooks/useDatabase.ts`**: agregar invalidación de `grupo_miembros_detail`, `grupo_miembros_perfil` en `useCreatePersona` y `useUpdatePersona`.

## Resultado esperado

Al crear o editar una persona y asignarla a un grupo (Casa de Paz o Grupo Encuentro), el trigger crea automáticamente la fila en `grupo_miembros`. La UI del grupo se refresca y la persona aparece de inmediato en el panel de integrantes. Los 70 registros históricos también se sincronizan.

