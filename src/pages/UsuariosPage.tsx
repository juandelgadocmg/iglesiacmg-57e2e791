import { useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import ModuleHero from "@/components/shell/ModuleHero";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles, useUserRoles, useAssignRole, useRemoveRole } from "@/hooks/useUsuarios";
import { useReindexSeminarioVinculos, useSeminarioVinculacionStatus } from "@/hooks/useSeminario";
import InviteUserDialog from "@/components/usuarios/InviteUserDialog";
import EditUserDialog from "@/components/usuarios/EditUserDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldCheck, UserCog, Plus, X, Users, Pencil, Home, Trash2, Download, AlertTriangle, GraduationCap, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";
import PageSkeleton from "@/components/shared/PageSkeleton";

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

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  pastor: "bg-primary/10 text-primary border-primary/20",
  lider: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  secretaria: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  tesoreria: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  maestro: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  consolidador_lider: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  consolidador: "bg-accent text-accent-foreground border-border",
  lider_intercesion: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  lider_red: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  lider_casa_paz: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  consulta: "bg-muted text-muted-foreground border-border",
  seminario_admin: "bg-primary/10 text-primary border-primary/20",
  seminario_docente: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  seminario_estudiante: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

export default function UsuariosPage() {
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: roles, isLoading: loadingRoles } = useUserRoles();
  const { data: semVinculos, isLoading: loadingSemVinculos } = useSeminarioVinculacionStatus();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const reindex = useReindexSeminarioVinculos();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [editingProfile, setEditingProfile] = useState<any | null>(null);

  const profileByUserId = useMemo(() => {
    const map = new Map<string, any>();
    (profiles || []).forEach((p: any) => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["user_roles"] });
    queryClient.invalidateQueries({ queryKey: ["sem-vinculacion-status"] });
  };

  const isLoading = loadingProfiles || loadingRoles;

  if (isLoading) {
    return (
      <PageSkeleton variant="list" />
    );
  }

  const getUserRoles = (userId: string) =>
    (roles || []).filter((r) => r.user_id === userId);

  const handleAssign = async () => {
    if (!selectedUser || !selectedRole) return;
    const existing = getUserRoles(selectedUser);
    if (existing.some((r) => r.role === selectedRole)) {
      toast.error("El usuario ya tiene ese rol");
      return;
    }
    try {
      await assignRole.mutateAsync({ user_id: selectedUser, role: selectedRole as AppRole });
      toast.success("Rol asignado correctamente");
      setSelectedRole("");
    } catch {
      toast.error("Error al asignar rol. Solo administradores pueden gestionar roles.");
    }
  };

  const handleRemove = async (roleId: string) => {
    try {
      await removeRole.mutateAsync(roleId);
      toast.success("Rol eliminado");
    } catch {
      toast.error("Error al eliminar rol");
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`¿Eliminar permanentemente al usuario "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { action: "delete_user", user_id: userId },
      });
      if (error) throw new Error(error.message || "Error en la función");
      if (data?.error) throw new Error(data.error);
      toast.success(`Usuario "${name}" eliminado`);
      handleSuccess();
    } catch (err: any) {
      // If edge function not deployed yet, delete from DB directly
      try {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("user_id", userId);
        toast.success(`Usuario "${name}" eliminado (roles y perfil)`);
        toast.warning("La cuenta de auth requiere que la función edge esté desplegada en Supabase");
        handleSuccess();
      } catch {
        toast.error(err.message || "Error al eliminar usuario");
      }
    }
  };

  const totalUsers = profiles?.length || 0;
  const usersWithRoles = new Set((roles || []).map((r) => r.user_id)).size;
  const semRows = (semVinculos || []) as any[];
  const semStudents = semRows.filter((r) => r.has_student_role);
  const semIssues = semStudents.filter((r) => r.estado !== "ok");
  const semSinPersona = semStudents.filter((r) => r.estado === "sin_persona").length;
  const semSinMaterias = semStudents.filter((r) => r.estado === "sin_materias").length;

  const handleReindex = async () => {
    try {
      const r: any = await reindex.mutateAsync();
      toast.success(`Sincronización lista: ${r?.profiles_vinculados || 0} perfiles y ${r?.inscripciones_vinculadas || 0} inscripciones actualizadas.`);
      handleSuccess();
    } catch (e: any) {
      toast.error(e.message || "No se pudo sincronizar Seminario");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { data: usersData, error } = await supabase.rpc("get_users_for_export");
      if (error) throw error;
      if (!usersData || usersData.length === 0) {
        toast.error("No hay usuarios para exportar");
        return;
      }
      const rows = (usersData as any[]).map((u) => {
        const userRoles = (roles || []).filter((r) => r.user_id === u.user_id);
        const rolesText = userRoles.map((r) => ROLE_LABELS[r.role] || r.role).join(", ") || "Sin rol";
        return {
          "Nombre": u.display_name || "",
          "Email": u.email || "",
          "Roles": rolesText,
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 30 }, { wch: 35 }, { wch: 40 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
      XLSX.writeFile(wb, `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Archivo exportado exitosamente");
    } catch {
      toast.error("Error al exportar usuarios");
    }
  };

  return (
    <div className="animate-fade-in">
      <ModuleHero
        variant="usuarios"
        title="Usuarios & Roles"
        eyebrow="Identity & Access Management"
        description="Provisión de cuentas, RBAC granular por rol pastoral y vinculación automática al seminario."
        status={{ label: `${usersWithRoles}/${totalUsers} con rol`, tone: usersWithRoles === totalUsers ? "ok" : "warn" }}
        kpis={[
          { label: "Usuarios totales", value: totalUsers, hint: "Registrados en plataforma", tone: "info" },
          { label: "Con rol asignado", value: usersWithRoles, hint: `${totalUsers - usersWithRoles} sin asignar`, tone: "ok" },
          { label: "Roles del sistema", value: Constants.public.Enums.app_role.length, hint: "Definidos vía enum", tone: "info" },
          { label: "Cobertura RBAC", value: `${totalUsers ? Math.round((usersWithRoles/totalUsers)*100) : 0}%`, hint: "Usuarios con al menos 1 rol", tone: "warn" },
        ]}
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <InviteUserDialog onSuccess={handleSuccess} />
          </>
        }
      />


      {/* Seminario linking status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Vinculación Seminario Persona↔Usuario
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleReindex} disabled={reindex.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${reindex.isPending ? "animate-spin" : ""}`} />
              Sincronizar vínculos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSemVinculos ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold">{semStudents.length}</p>
                  <p className="text-xs text-muted-foreground">Estudiantes con rol</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold">{semStudents.length - semIssues.length}</p>
                  <p className="text-xs text-muted-foreground">Listos para ver materias</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold">{semSinPersona}</p>
                  <p className="text-xs text-muted-foreground">Sin persona vinculada</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold">{semSinMaterias}</p>
                  <p className="text-xs text-muted-foreground">Sin materias visibles</p>
                </div>
              </div>

              {semIssues.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Todos los estudiantes de Seminario tienen persona, inscripción y materias visibles según su matrícula.
                </div>
              ) : (
                <div className="rounded-lg border divide-y overflow-hidden">
                  {semIssues.map((row) => {
                    const profile = profileByUserId.get(row.user_id);
                    return (
                      <div key={row.user_id} className="p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <p className="font-medium text-sm truncate">{row.display_name || row.email || row.user_id}</p>
                            <Badge variant={row.estado === "ok" ? "default" : "destructive"} className="text-[10px]">
                              {row.estado === "sin_persona" ? "Sin persona" : row.estado === "sin_inscripcion" ? "Sin inscripción" : "Sin materias visibles"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{row.email || "Sin correo"}</p>
                          <p className="text-xs text-muted-foreground">
                            Persona: {row.persona_nombre || "No vinculada"}{row.persona_documento ? ` · ${row.persona_documento}` : ""} · Inscripciones: {row.inscripciones_count || 0} · Materias: {row.materias_count || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">{row.detalle}</p>
                        </div>
                        {profile && (
                          <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setEditingProfile(profile)}>
                            <Link2 className="h-3.5 w-3.5" /> Corregir vínculo
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Assign Role */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" /> Asignación rápida de rol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedUser || ""} onValueChange={setSelectedUser}>
              <SelectTrigger className="sm:w-[280px]">
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {(profiles || []).map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display_name || p.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.app_role.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} disabled={!selectedUser || !selectedRole || assignRole.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Asignar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(profiles || []).map((profile) => {
              const userRoles = getUserRoles(profile.user_id);
              const isCurrentUser = user?.id === profile.user_id;
              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors gap-3"
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {(profile.display_name || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {profile.display_name || "Sin nombre"}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(Tú)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{profile.user_id.slice(0, 12)}...</p>
                      {(profile as any).grupo && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Home className="h-3 w-3" />
                          {(profile as any).grupo.nombre}
                          {(profile as any).grupo.red && <span>· Red {(profile as any).grupo.red}</span>}
                        </p>
                      )}
                      {(profile as any).red && !(profile as any).grupo && (
                        <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                          🌐 Red {(profile as any).red}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Roles + edit button */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {userRoles.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Sin roles</span>
                    )}
                    {userRoles.map((r) => (
                      <Badge
                        key={r.id}
                        variant="outline"
                        className={`${ROLE_COLORS[r.role]} text-xs gap-1 pr-1`}
                      >
                        {ROLE_LABELS[r.role]}
                        <button
                          onClick={() => handleRemove(r.id)}
                          className="ml-1 hover:bg-foreground/10 rounded-full p-0.5 transition-colors"
                          title="Eliminar rol"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}

                    {/* Edit button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs ml-1"
                      onClick={() => setEditingProfile(profile)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    {!isCurrentUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs ml-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(profile.user_id, profile.display_name || profile.user_id.slice(0,8))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {(!profiles || profiles.length === 0) && (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                No hay usuarios registrados
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingProfile && (
        <EditUserDialog
          profile={editingProfile}
          userRoles={getUserRoles(editingProfile.user_id)}
          open={!!editingProfile}
          onOpenChange={(open) => { if (!open) setEditingProfile(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
