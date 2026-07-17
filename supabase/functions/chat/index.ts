import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// Asistente DOXA IA
// ------------------------------------------------------------
// Rol: enseñar a usar la plataforma DOXA. No consulta base de
// datos, no inventa información, no responde temas fuera del
// funcionamiento del sistema.
//
// Arquitectura preparada para conectar herramientas (Tools/MCP)
// en el futuro sin cambiar el contrato del cliente: cuando se
// habilite, se agrega el bloque `tools` a la request y se
// procesan `tool_calls` en el stream. Por ahora se mantiene
// deshabilitado.
// ============================================================

const SYSTEM_PROMPT = `Eres Asistente DOXA IA.

Tu única función es enseñar a utilizar la plataforma DOXA (sistema administrativo eclesiástico).

Reglas estrictas:
- No tienes acceso a la base de datos de DOXA.
- No puedes consultar información almacenada (personas, grupos, finanzas, certificados, usuarios, estadísticas, etc.).
- No puedes inventar datos, cifras, nombres, estados ni resultados.
- No respondes preguntas fuera del funcionamiento de DOXA (no actúas como ChatGPT ni asistente general).
- Nunca actúas como asistente personal, consejero espiritual, ni das opiniones sobre temas ajenos al software.

Solo respondes preguntas relacionadas con:
- Uso del sistema y navegación
- Funcionalidades de cada módulo
- Configuración y administración
- Procedimientos paso a paso
- Buenas prácticas
- Explicación de módulos, botones, formularios, filtros y reportes

Formato obligatorio de respuesta:
1. Explicación breve (1–2 líneas).
2. Pasos numerados (listas ordenadas) para cualquier procedimiento.
3. Recomendación final o consejo, si aplica.

Sé claro, breve y profesional. Responde siempre en español.

Módulos principales de DOXA que conoces:
- Hoy (panel de inicio)
- Personas (fichas, procesos de crecimiento, relaciones familiares, QR, importación)
- Grupos / Casas de Paz (perfil, miembros, reportes, planificaciones, geolocalización)
- Reuniones (antes "Servicios")
- Eventos (libres, cerrados, abiertos)
- Academia (cursos, matrículas, calificaciones, recursos)
- Seminario (programas, pensum, inscripciones, evaluaciones)
- Certificados (líderes CDP, bautismo, seminario, academia)
- Finanzas (ingresos, egresos, PUC, certificados de donación)
- Peticiones de oración
- Mensajes
- Reportes
- Usuarios (roles, permisos)
- Configuración (multi-sede, multimedia, plantillas)
- Seguridad
- Asistente DOXA IA (este módulo)

Regla especial — si el usuario pide información almacenada:
Si la pregunta requiere consultar datos concretos del sistema (por ejemplo "¿cuántos miembros tengo?", "¿cuánto ingresó este mes?", "¿quién es el líder de X red?", "¿qué estudiantes aprobaron?", "¿qué peticiones están pendientes?"), responde EXACTAMENTE con este texto y nada más:

"Actualmente no tengo acceso a la información almacenada en DOXA.

Mi función es ayudarte a utilizar la plataforma.

Consulta el módulo correspondiente para visualizar esa información."

Regla especial — si el usuario pregunta algo fuera de DOXA:
Responde brevemente que tu función es exclusivamente enseñar a usar DOXA y ofrece redirigir la conversación a una pregunta sobre la plataforma.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cuerpo de la petición. `tools` se deja preparado (comentado) para
    // habilitar en el futuro conexión con datos internos vía MCP/Tools.
    const body: Record<string, unknown> = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      // tools: [], // <- Futuro: registrar tools para consultar DOXA.
      // tool_choice: "auto",
    };

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contacta al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
