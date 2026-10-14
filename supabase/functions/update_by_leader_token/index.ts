import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, leader_token, discipulo_id, etapas_completadas, seguimiento } = body

    // Lookup: return leader info by token (no update_token exposed to client)
    if (action === 'lookup') {
      if (!leader_token) {
        return new Response(JSON.stringify({ error: 'Token requerido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: ldr } = await supabase
          .from('leaders')
          .select('id, full_name')
          .eq('update_token', leader_token)
          .maybeSingle()
      if (!ldr) {
        return new Response(JSON.stringify({ error: 'Token inválido' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ leader: ldr }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!leader_token || !discipulo_id || !Array.isArray(etapas_completadas)) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate leader token
    const { data: leader, error: leaderErr } = await supabase
      .from('leaders')
      .select('id')
      .eq('update_token', leader_token)
      .maybeSingle()

    if (leaderErr || !leader) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate discipulo belongs to leader
    const { data: disc, error: discErr } = await supabase
      .from('discipulos')
      .select('id')
      .eq('id', discipulo_id)
      .eq('lider_id', leader.id)
      .maybeSingle()

    if (discErr || !disc) {
      return new Response(JSON.stringify({ error: 'Discípulo no encontrado o no pertenece a este líder' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allEtapas = ['NPT', 'TSDP', 'NVNC', 'RSI', 'DNC', 'ES', 'LCP', 'RLCP']

    // Upsert progress for each etapa
    for (const code of allEtapas) {
      const completed = etapas_completadas.includes(code)
      const { data: existing } = await supabase
        .from('progreso_discipulo')
        .select('id, completed')
        .eq('discipulo_id', discipulo_id)
        .eq('etapa_code', code)
        .maybeSingle()

      if (existing) {
        if (existing.completed !== completed) {
          await supabase.from('progreso_discipulo').update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
        }
      } else if (completed) {
        await supabase.from('progreso_discipulo').insert({
          discipulo_id,
          etapa_code: code,
          completed: true,
          completed_at: new Date().toISOString(),
        })
      }
    }

    // Update last_update_at
    await supabase.from('discipulos').update({
      last_update_at: new Date().toISOString(),
    }).eq('id', discipulo_id)

    // Insert seguimiento if provided
    if (seguimiento?.resumen) {
      await supabase.from('seguimientos').insert({
        discipulo_id,
        resumen: seguimiento.resumen,
        fecha: seguimiento.fecha || new Date().toISOString().split('T')[0],
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
