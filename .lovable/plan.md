

## Filtro por fecha + envío por WhatsApp en Peticiones

### 1. Filtro por fecha con exportación

En `src/pages/PeticionesPage.tsx`:

- Dos selectores **Desde / Hasta** (Popover + Calendar shadcn) junto al buscador, con botón "Limpiar".
- Presets rápidos: **Hoy**, **Esta semana**, **Este mes**, **Este año**.
- Filtra por `created_at` de la petición; aplica también a contadores, gráfica y tabla.
- El botón **Exportar** (PDF / Excel) usa el listado ya filtrado.
- Cuando hay rango activo, el título y nombre del archivo incluyen el período: `Peticiones de Oración (01/04/2026 – 22/04/2026)` y `peticiones-oracion-20260401-20260422`.
- Indicador visible: "Mostrando X peticiones del DD/MM/YYYY al DD/MM/YYYY".

### 2. Responder por WhatsApp

Enfoque: **WhatsApp click-to-chat** (`https://wa.me/<numero>?text=<mensaje>`). No requiere API, ni keys, ni edge functions. Funciona con WhatsApp Web (en escritorio) o la app (en móvil) según el dispositivo del usuario, usando el WhatsApp del propio responsable.

En la tarjeta de cada petición (modo Gestionar) y en una nueva columna de acción (modo Panel):

- Botón **"Responder por WhatsApp"** (verde, ícono de WhatsApp).
- Habilitado solo si la persona tiene `whatsapp` o `telefono` registrado; deshabilitado con tooltip "Sin número de WhatsApp" en caso contrario.
- Al pulsar, abre `https://wa.me/<numero>?text=<plantilla>` en una nueva pestaña.
- Plantilla de mensaje editable en un pequeño diálogo previo con texto sugerido, por ejemplo:

  > Hola {nombre}, desde {iglesia} estamos orando por tu petición: "{titulo}". {mensaje_personalizado} Bendiciones.

  El usuario puede ajustar el mensaje y pulsar **Enviar por WhatsApp**.
- Se normaliza el número (quita espacios, guiones, paréntesis y el "+"). Si el número no tiene código de país, se antepone el código por defecto (Colombia `57`, configurable más adelante).
- Al enviar, se actualiza opcionalmente el estado de la petición a **"En oración"** si estaba en **"Pendiente"** y se agrega una línea a `notas_seguimiento` tipo `"[22/04/2026] Respondida por WhatsApp"` para dejar trazabilidad.

### Detalles técnicos

- Sin cambios en base de datos, RLS ni edge functions.
- Se reutilizan `Popover`, `Calendar`, `Dialog`, `Textarea`, `Button`, `date-fns`, `usePeticiones`, `useUpdatePeticion`, `useConfiguracion` (para tomar el nombre de la iglesia en la plantilla).
- Nuevo helper `src/lib/whatsapp.ts` con `buildWhatsAppUrl(numero, mensaje, defaultCountryCode)` y `normalizePhone(numero)`.
- Asegurar `pointer-events-auto` en `Calendar` dentro de `Popover`.

### Resultado

El usuario podrá: (1) elegir un rango de fechas y descargar un informe PDF/Excel solo con las peticiones de ese período, y (2) abrir WhatsApp con un mensaje pre-redactado para responder directamente a cada persona, registrando automáticamente el contacto en el seguimiento de la petición.

