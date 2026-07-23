import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type InviteBody = {
  action?: "delete_user" | "reset_password";
  user_id?: string;
  email?: string;
  password?: string;
  display_name?: string;
  roles?: string[];
  grupo_id?: string | null;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function findUserByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => normalizeEmail(item.email || "") === target);
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function syncUserAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  displayName: string,
  roles: string[],
  grupoId: string | null,
) {
  const trimmedName = displayName.trim();
  const profileUpdate: Record<string, string | null> = {
    display_name: trimmedName,
    grupo_id: grupoId,
  };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update(profileUpdate)
    .eq("user_id", userId);

  if (profileError) throw profileError;

  const uniqueRoles = Array.from(new Set(roles.filter(Boolean)));
  const { error: deleteRolesError } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  if (deleteRolesError) throw deleteRolesError;

  if (uniqueRoles.length > 0) {
    const { error: insertRolesError } = await supabaseAdmin
      .from("user_roles")
      .insert(uniqueRoles.map((role) => ({ user_id: userId, role })));

    if (insertRolesError) throw insertRolesError;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isAdmin = (callerRoles || []).some(
      (r: any) => r.role === "admin" || r.role === "super_admin"
    );
    if (!isAdmin) {
      return jsonResponse({ error: "Solo administradores pueden crear usuarios" }, 403);
    }

    const body = await req.json() as InviteBody;
    const { action } = body;

    // ── Delete user action ──
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) {
        return jsonResponse({ error: "user_id es requerido" }, 400);
      }
      // Delete roles first
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);
      // Delete auth user
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteErr) {
        return jsonResponse({ error: deleteErr.message }, 400);
      }
      return jsonResponse({ success: true });
    }

    // ── Reset password action ──
    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !password) {
        return jsonResponse({ error: "user_id y password son requeridos" }, 400);
      }
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (updateErr) {
        return jsonResponse({ error: updateErr.message }, 400);
      }
      return jsonResponse({ success: true });
    }

    // ── Create user action (default) ──
    const { email, password, display_name, roles = [], grupo_id } = body;

    if (!email?.trim() || !password?.trim()) {
      return jsonResponse({ error: "Email y contraseña son requeridos" }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return jsonResponse({ error: "Selecciona al menos un rol" }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const safeDisplayName = display_name?.trim() || normalizedEmail;
    const safeGrupoId = grupo_id?.trim() || null;

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: safeDisplayName },
    });

    if (createError) {
      if (/already been registered|already registered|email.*exists|email_exists/i.test(createError.message)) {
        const existingUser = await findUserByEmail(supabaseAdmin, normalizedEmail);
        if (!existingUser) {
          return jsonResponse({ error: "El correo ya está registrado, pero no se pudo localizar la cuenta existente." }, 409);
        }

        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { display_name: safeDisplayName },
        });
        await syncUserAccess(supabaseAdmin, existingUser.id, safeDisplayName, roles, safeGrupoId);

        return jsonResponse({
          success: true,
          user_id: existingUser.id,
          existing_user: true,
          message: "El correo ya existía; actualicé su nombre, roles y grupo asignado.",
        });
      }

      return jsonResponse({ error: createError.message }, 400);
    }

    if (!newUser.user) {
      return jsonResponse({ error: "No se pudo crear la cuenta de usuario" }, 500);
    }

    await syncUserAccess(supabaseAdmin, newUser.user.id, safeDisplayName, roles, safeGrupoId);

    return jsonResponse({ success: true, user_id: newUser.user.id });
  } catch (err) {
    console.error("Error in invite-user:", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return jsonResponse({ error: message || "Error interno del servidor" }, 500);
  }
});
