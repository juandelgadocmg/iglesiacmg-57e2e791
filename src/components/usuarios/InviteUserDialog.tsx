import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

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
};

// Roles que requieren seleccionar un grupo asignado
const ROLES_CON_GRUPO: AppRole[] = ["lider_casa_paz", "lider_red"];

interface InviteUserDialogProps {
  onSuccess: () => void;
}

export default function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [grupoId, setGrupoId] = useState("");
  const [grupos, setGrupos] = useState<{ id: string; nombre: string; red: string | null; tipo: string }[]>([]);

  const needsGrupo = selectedRoles.some(r => ROLES_CON_GRUPO.includes(r));

  useEffect(() => {
    if (open && needsGrupo) {
      supabase
        .from("grupos")
        .select("id, nombre, red, tipo")
        .eq("estado", "Activo")
        .order("nombre")
        .then(({ data }) => setGrupos(data || []));
    }
  }, [open, needsGrupo]);

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
    if (!ROLES_CON_GRUPO.includes(role)) setGrupoId("");
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Email y contraseña son requeridos");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error("Selecciona al menos un rol");
      return;
    }
    if (needsGrupo && !grupoId) {
      toast.error("Debes asignar un grupo a este usuario");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: email.trim(),
          password,
          display_name: displayName.trim() || email.trim(),
          roles: selectedRoles,
          grupo_id: needsGrupo ? grupoId : null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Si la función no asigna grupo_id al profile, lo hacemos aquí
      if (needsGrupo && grupoId && data?.user_id) {
        const { error: grupoErr } = await supabase
          .from("profiles")
          .update({ grupo_id: grupoId } as any)
          .eq("user_id", data.user_id);

        if (grupoErr) {
          if (grupoErr.message?.includes("grupo_id") || grupoErr.message?.includes("schema cache")) {
            toast.warning(
              "Usuario creado, pero la asignación de grupo requiere una migración pendiente. Ve a Supabase → SQL Editor y ejecuta: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL;",
              { duration: 8000 }
            );
          } else {
            throw grupoErr;
          }
        }
      }

      toast.success("Usuario creado y grupo asignado exitosamente");
      setOpen(false);
      setEmail(""); setPassword(""); setDisplayName("");
      setSelectedRoles([]); setGrupoId("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar grupos según rol: lider_casa_paz → Casas de paz, lider_red → cualquiera
  const gruposFiltrados = grupos.filter(g => {
    if (selectedRoles.includes("lider_casa_paz")) return g.tipo === "Casas de paz";
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" /> Crear Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre</Label>
            <Input
              id="displayName"
              placeholder="Nombre del usuario"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Roles y permisos *</Label>
            <div className="grid grid-cols-1 gap-2 mt-1">
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
          </div>

          {/* Selector de grupo — solo aparece si el rol lo requiere */}
          {needsGrupo && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Label className="text-sm font-medium">
                {selectedRoles.includes("lider_casa_paz") ? "Casa de Paz asignada *" : "Grupo asignado *"}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                El usuario verá directamente su grupo al iniciar sesión.
              </p>
              <Select value={grupoId} onValueChange={setGrupoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {gruposFiltrados.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex flex-col">
                        <span>{g.nombre}</span>
                        {g.red && <span className="text-xs text-muted-foreground">Red {g.red}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Creando..." : "Crear Usuario"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
