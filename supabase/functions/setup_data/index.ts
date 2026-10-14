import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  for (const byte of arr) {
    result += chars[byte % chars.length]
  }
  return result
}

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
    const { setup_key, action } = body

    const expectedKey = Deno.env.get('SETUP_KEY') || 'discipulando2026'
    if (setup_key !== expectedKey) {
      return json({ error: 'Clave de setup inválida' }, 403)
    }

    // ── REDES ──
    if (action === 'create_red') {
      const { name, lider_red } = body
      if (!name) return json({ error: 'Nombre requerido' }, 400)
      const { data, error } = await supabase.from('redes').insert({ name, lider_red: lider_red || null }).select().single()
      if (error) throw new Error(error.message)
      return json({ red: data })
    }

    if (action === 'update_red') {
      const { red_id, name, lider_red } = body
      if (!red_id || !name) return json({ error: 'ID y nombre requeridos' }, 400)
      const { data, error } = await supabase.from('redes').update({ name, lider_red: lider_red || null }).eq('id', red_id).select().single()
      if (error) throw new Error(error.message)
      return json({ red: data })
    }

    if (action === 'delete_red') {
      const { red_id } = body
      await supabase.from('casas_de_paz').update({ red_id: null }).eq('red_id', red_id)
      await supabase.from('redes').delete().eq('id', red_id)
      return json({ success: true })
    }

    // ── CASAS DE PAZ ──
    if (action === 'create_casa') {
      const { name, city, red_id } = body
      if (!name) return json({ error: 'Nombre requerido' }, 400)
      const { data, error } = await supabase.from('casas_de_paz').insert({ name, city: city || null, red_id: red_id || null }).select().single()
      if (error) throw new Error(error.message)
      return json({ casa: data })
    }

    if (action === 'update_casa') {
      const { casa_id, name, city, red_id } = body
      if (!casa_id || !name) return json({ error: 'ID y nombre requeridos' }, 400)
      const { data, error } = await supabase.from('casas_de_paz').update({ name, city: city || null, red_id: red_id || null }).eq('id', casa_id).select().single()
      if (error) throw new Error(error.message)
      return json({ casa: data })
    }

    if (action === 'delete_casa') {
      const { casa_id } = body
      await supabase.from('leaders').update({ casa_de_paz_id: null }).eq('casa_de_paz_id', casa_id)
      await supabase.from('discipulos').update({ casa_de_paz_id: null }).eq('casa_de_paz_id', casa_id)
      await supabase.from('casas_de_paz').delete().eq('id', casa_id)
      return json({ success: true })
    }

    // ── LEADERS ──
    if (action === 'create_leader') {
      const { full_name, casa_de_paz_id } = body
      if (!full_name) return json({ error: 'Nombre requerido' }, 400)
      const token = generateToken()
      const { data, error } = await supabase.from('leaders').insert({
        id: crypto.randomUUID(), full_name, update_token: token, casa_de_paz_id: casa_de_paz_id || null,
      }).select().single()
      if (error) throw new Error(error.message)
      return json({ leader: data })
    }

    if (action === 'update_leader') {
      const { leader_id, full_name, casa_de_paz_id } = body
      if (!leader_id || !full_name) return json({ error: 'ID y nombre requeridos' }, 400)
      const { data, error } = await supabase.from('leaders').update({ full_name, casa_de_paz_id: casa_de_paz_id || null }).eq('id', leader_id).select().single()
      if (error) throw new Error(error.message)
      return json({ leader: data })
    }

    if (action === 'generate_token') {
      const { leader_id } = body
      if (!leader_id) return json({ error: 'ID requerido' }, 400)
      const token = generateToken()
      const { data, error } = await supabase.from('leaders').update({ update_token: token }).eq('id', leader_id).select().single()
      if (error) throw new Error(error.message)
      return json({ leader: data })
    }

    if (action === 'list_leaders') {
      const { data, error } = await supabase.from('leaders').select('*').order('full_name')
      if (error) throw error
      return json({ leaders: data })
    }

    if (action === 'delete_leader') {
      const { leader_id } = body
      const discIds = (await supabase.from('discipulos').select('id').eq('lider_id', leader_id)).data?.map((d: any) => d.id) || []
      if (discIds.length > 0) {
        await supabase.from('progreso_discipulo').delete().in('discipulo_id', discIds)
        await supabase.from('seguimientos').delete().in('discipulo_id', discIds)
      }
      await supabase.from('discipulos').delete().eq('lider_id', leader_id)
      await supabase.from('leaders').delete().eq('id', leader_id)
      return json({ success: true })
    }

    // ── DISCIPULOS ──
    if (action === 'create_discipulo') {
      const { full_name, lider_id, casa_de_paz_id } = body
      if (!full_name || !lider_id) return json({ error: 'Nombre y líder requeridos' }, 400)
      const { data, error } = await supabase.from('discipulos').insert({
        full_name, lider_id, casa_de_paz_id: casa_de_paz_id || null, status: 'Activo',
      }).select().single()
      if (error) throw error
      return json({ discipulo: data })
    }

    if (action === 'update_discipulo') {
      const { discipulo_id, full_name, lider_id, casa_de_paz_id, status } = body
      if (!discipulo_id || !full_name) return json({ error: 'ID y nombre requeridos' }, 400)
      const updates: any = { full_name }
      if (lider_id !== undefined) updates.lider_id = lider_id || null
      if (casa_de_paz_id !== undefined) updates.casa_de_paz_id = casa_de_paz_id || null
      if (status) updates.status = status
      const { data, error } = await supabase.from('discipulos').update(updates).eq('id', discipulo_id).select().single()
      if (error) throw error
      return json({ discipulo: data })
    }

    if (action === 'delete_discipulo') {
      const { discipulo_id } = body
      await supabase.from('progreso_discipulo').delete().eq('discipulo_id', discipulo_id)
      await supabase.from('seguimientos').delete().eq('discipulo_id', discipulo_id)
      await supabase.from('discipulos').delete().eq('id', discipulo_id)
      return json({ success: true })
    }

    return json({ error: 'Acción no reconocida' }, 400)
  } catch (err) {
    const details = err instanceof Error ? err.message : JSON.stringify(err)
    return json({ error: 'Error interno', details }, 500)
  }
})
