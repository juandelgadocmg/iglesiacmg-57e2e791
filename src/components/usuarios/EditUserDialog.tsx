import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, KeyRound, User, ShieldCheck, Home, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import SearchableCombobox from "@/components/seminario/SearchableCombobox";
import { usePersonasLite } from "@/hooks/useSeminario";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Usuario Principal",
  super_admin: "Super Administrador",
  pastor: "Pastor",
  lider: "Líder",
  secretaria: "Secretaria",
  tesoreria: "Tesorería",
  maestro: "Maestro",
  consolidador_lider: "Consolidador Líder",
  consolidador: "Consolidador",
  lider_intercesion: "Líder de Intercesión",
  lider_red: "Líder de Red",
  lider_casa_paz: "Líder Casa de Paz",
  consulta: "Consulta",
  seminario_admin: "Seminario · Admin",
  seminario_docente: "Seminario · Docente",
  seminario_estudiante: "Seminario · Estudiante",
  coordinador_infantil: "Coordinador Infantil",
  recepcion_infantil: "Recepción Infantil",
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acceso total al sistema",
  super_admin: "Acceso completo sin restricciones",
  pastor: "Acceso casi total excepto configuración",
  lider: "Personas, Grupos, Servicios, Eventos",
  secretaria: "Personas, Servicios, Eventos, Peticiones",
  tesoreria: "Finanzas, Donaciones, Reportes",
  maestro: "Academia y Certificados",
  consolidador_lider: "Crear/editar personas y peticiones, sin eliminar",
  consolidador: "Editar información de crecimiento espiritual",
  lider_intercesion: "Ver y responder peticiones de oración",
  lider_red: "Ver personas y grupos de su red (solo lectura), crear reportes de su red",
  lider_casa_paz: "Ver personas de casas de paz (solo lectura), crear reporte de su CDP",
  consulta: "Solo lectura del dashboard",
  seminario_admin: "Administra programas, pensum, materias y matrículas del Seminario",
  seminario_docente: "Gestiona materias asignadas, calificaciones y asistencia",
  seminario_estudiante: "Acceso a su kárdex, materias inscritas y biblioteca",
  coordinador_infantil: "Gestión del módulo Iglesia Infantil",
  recepcion_infantil: "Check-in y recepción de Iglesia Infantil",
};

const ROLES_CON_GRUPO: AppRole[] = ["lider_casa_paz", "lider_red", "lider", "consolidador_lider", "consolidador"];

interface UserRole { id: string; role: AppRole; user_id: string; }

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  grupo_id?: string | null;
  red?: string | null;
  persona_id?: string | null;
}

const REDES = ["Nissi", "Rohi", "Jireh", "Adonai", "Shaddai", "Elohim"];

interface EditUserDialogProps {
  profile: Profile;
  userRoles: UserRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditUserDialog({ profile, userRoles, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { data: personas = [] } = usePersonasLite();
  const [displayName, setDisplayName]   = useState(profile.display_name || "");
  const [newPassword, setNewPassword]   = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(userRoles.map(r => r.role));
  const [grupoId, setGrupoId]           = useState(profile.grupo_id || "");
  const [red, setRed]                   = useState(profile.red || "");
  const [personaId, setPersonaId]       = useState(profile.persona_id || "");
  const [grupos, setGrupos]             = useState<{ id: string; nombre: string; red: string | null; tipo: string }[]>([]);
  const [loading, setLoading]           = useState(false);
  const [section, setSection]           = useState<"info" | "roles" | "grupo" | "seminario">("info");

  const needsGrupo = selectedRoles.some(r => ROLES_CON_GRUPO.includes(r));
  const isLiderRed = selectedRoles.includes("lider_red");

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name || "");
      setNewPassword("");
      setSelectedRoles(userRoles.map(r => r.role));
      setGrupoId(profile.grupo_id || "");
      setRed(profile.red || "");
      setPersonaId(profile.persona_id || "");
      setSection("info");
    }
  }, [open, profile, userRoles]);

  useEffect(() => {
    if (open) {
      supabase.from("grupos").select("id, nombre, red, tipo").eq("estado", "Activo").order("nombre")
        .then(({ data }) => setGrupos(data || []));
    }
  }, [open]);

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const personaItems = useMemo(() => (personas as any[]).map((p: any) => ({
    id: p.id,
    label: `${p.nombres || ""} ${p.apellidos || ""}`.trim() || "Sin nombre",
    sub: [p.documento, p.email, p.telefono].filter(Boolean).join(" · "),
  })), [personas]);

  const selectedPersona = (personas as any[]).find((p: any) => p.id === personaId);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update display_name in profile
      const { error: nameErr } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || profile.display_name })
        .eq("user_id", profile.user_id);
      if (nameErr) throw nameErr;

      // 2. Update grupo_id and red
      const finalGrupoId = (grupoId && grupoId !== "none") ? grupoId : null;
      const finalRed = (isLiderRed && red && red !== "none") ? red : null;
      const finalPersonaId = (personaId && personaId !== "none") ? personaId : null;
      const { error: grupoErr } = await supabase
        .from("profiles")
        .update({ grupo_id: finalGrupoId, red: finalRed, persona_id: finalPersonaId } as any)
        .eq("user_id", profile.user_id);
      if (grupoErr) {
        if (grupoErr.message?.includes("schema cache") || grupoErr.message?.includes("red")) {
          toast.warning("Datos guardados. Ejecuta las migraciones pendientes en Supabase SQL Editor.", { duration: 6000 });
        } else throw grupoErr;
      }

      // 2. Sync roles — remove old, add new
      const currentRoleIds = userRoles.map(r => r.id);
      const currentRoleValues = userRoles.map(r => r.role);

      const toRemove = userRoles.filter(r => !selectedRoles.includes(r.role));
      const toAdd = selectedRoles.filter(r => !currentRoleValues.includes(r));

      for (const r of toRemove) {
        await supabase.from("user_roles").delete().eq("id", r.id);
      }
      for (const role of toAdd) {
        await supabase.from("user_roles").insert({ user_id: profile.user_id, role });
      }

      // 3. Reset password if provided
      if (newPassword.trim()) {
        if (newPassword.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); setLoading(false); return; }
        const { error: pwErr } = await supabase.functions.invoke("invite-user", {
          body: { action: "reset_password", user_id: profile.user_id, password: newPassword.trim() },
        });
        if (pwErr) throw pwErr;
      }

      toast.success("Usuario actualizado correctamente");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar usuario");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { key: "info" as const,  label: "Información", icon: User, show: true },
    { key: "roles" as const, label: "Roles",       icon: ShieldCheck, show: true },
    { key: "grupo" as const, label: "Grupo",       icon: Home, show: true },
    { key: "seminario" as const, label: "Seminario", icon: GraduationCap, show: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Editar usuario — <span className="text-primary font-bold">{profile.display_name || "Sin nombre"}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Section tabs */}
        <div className="flex gap-1 border-b pb-2">
          {sections.filter(s => s.show !== false).map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                section === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">

          {/* ── INFORMACIÓN ── */}
          {section === "info" && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nombre del usuario</Label>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                />
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. Solo escribe si deseas cambiarla.</p>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium">ID:</span> {profile.user_id.slice(0, 16)}...</p>
                <p><span className="font-medium">Roles actuales:</span> {userRoles.length === 0 ? "Sin roles" : userRoles.map(r => ROLE_LABELS[r.role]).join(", ")}</p>
                {profile.grupo_id && <p><span className="font-medium">Grupo asignado:</span> {grupos.find(g => g.id === profile.grupo_id)?.nombre || profile.grupo_id.slice(0,8)}</p>}
                {selectedPersona && <p><span className="font-medium">Persona vinculada:</span> {selectedPersona.nombres} {selectedPersona.apellidos}</p>}
              </div>
            </div>
          )}

          {/* ── ROLES ── */}
          {section === "roles" && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                Marca los roles que tendrá este usuario. Los cambios se aplican al guardar.
              </p>
              {Constants.public.Enums.app_role.map(role => (
                <label
                  key={role}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRoles.includes(role)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* ── GRUPO ── */}
          {section === "grupo" && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                Asigna un grupo (Casa de Paz, Red, etc.) a este usuario para que pueda ver y gestionar su grupo al iniciar sesión.
              </div>
              {/* Red selector — only for lider_red */}
              {isLiderRed && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    🌐 Red asignada <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">El líder de red verá solo los grupos de esta red.</p>
                  <Select value={red} onValueChange={setRed}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar red..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REDES.map(r => (
                        <SelectItem key={r} value={r}>Red {r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {red && (
                    <p className="text-xs text-success font-medium">✓ Red seleccionada: {red}</p>
                  )}
                </div>
              )}

              {/* Grupo selector — for lider_casa_paz */}
              {selectedRoles.includes("lider_casa_paz") && (
              <div className="space-y-2">
                <Label>{isLiderRed ? "Casa de Paz propia (opcional)" : "Casa de Paz asignada"}</Label>
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {grupos.filter(g => g.tipo === "Casas de paz" || g.tipo === "Grupos encuentro").map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        <span>{g.nombre}</span>
                        {g.red && <span className="text-xs text-muted-foreground ml-2">· Red {g.red}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {grupoId && grupoId !== "none" && (
                  <p className="text-xs text-success font-medium">
                    ✓ Grupo seleccionado: {grupos.find(g => g.id === grupoId)?.nombre}
                  </p>
                )}
              </div>
              )}
            </div>
          )}

          {/* ── SEMINARIO ── */}
          {section === "seminario" && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                Vincula este usuario con su ficha de persona. Esto permite que los estudiantes vean sus materias aunque el correo de la cuenta y el correo registrado en Personas no coincidan.
              </div>
              <div className="space-y-2">
                <Label>Persona vinculada</Label>
                <SearchableCombobox
                  items={personaItems}
                  value={personaId}
                  onChange={setPersonaId}
                  placeholder="Buscar por nombre, documento, correo o teléfono…"
                  emptyLabel="No hay personas con ese criterio"
                  width="w-full"
                />
                {selectedPersona ? (
                  <p className="text-xs text-success font-medium">
                    ✓ Vinculado a {selectedPersona.nombres} {selectedPersona.apellidos}{selectedPersona.documento ? ` · ${selectedPersona.documento}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Selecciona la ficha real del estudiante o deja vacío si no aplica.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
