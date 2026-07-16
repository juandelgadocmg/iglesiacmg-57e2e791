import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import PersonaFormDialog from "@/components/forms/PersonaFormDialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import MetricCard from "@/components/shared/MetricCard";
import { usePersonas, useDeletePersona } from "@/hooks/useDatabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pencil, Users, UserPlus, Search, Phone, Mail, MapPin,
  Church, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";
import ImportPersonasDialog from "@/components/forms/ImportPersonasDialog";
import { useUserRoles } from "@/hooks/useUserRoles";
import { canPerform } from "@/lib/permissions";
import { useActiveRole } from "@/hooks/useActiveRole";

const TIPOS = [
  "Todos", "Miembro", "Visitante", "Líder", "Servidor", "CDP",
  "Iglesia Virtual", "Estudiante Seminario", "Discípulo",
  "Maestro Seminario", "Miembro No Activo", "Líder Casa de Paz",
  "Líder de Red", "Mentor", "Pastor Principal",
];

const tipoColor: Record<string, string> = {
  Miembro: "bg-primary/10 text-primary",
  Visitante: "bg-info/10 text-info",
  Líder: "bg-accent/10 text-accent",
  Servidor: "bg-success/10 text-success",
  CDP: "bg-warning/10 text-warning",
  "Iglesia Virtual": "bg-muted text-muted-foreground",
  "Estudiante Seminario": "bg-info/10 text-info",
  "Discípulo": "bg-primary/10 text-primary",
  "Maestro Seminario": "bg-accent/10 text-accent",
  "Miembro No Activo": "bg-destructive/10 text-destructive",
  "Líder Casa de Paz": "bg-success/10 text-success",
  "Líder de Red": "bg-accent/10 text-accent",
  "Mentor": "bg-primary/10 text-primary",
  "Pastor Principal": "bg-accent/10 text-accent",
};

export default function PersonasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: personas, isLoading } = usePersonas();
  const deletePersona = useDeletePersona();
  const [editing, setEditing] = useState<any>(null);
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const canEdit   = canPerform(roles, "personas:edit");
  const canCreate = canPerform(roles, "personas:create");
  const canDelete = canPerform(roles, "personas:delete");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [grupoFilter, setGrupoFilter] = useState("all");
  const [ministerioFilter, setMinisterioFilter] = useState("all");
  const [altaDesde, setAltaDesde] = useState<string>("");
  const [altaHasta, setAltaHasta] = useState<string>("");
  const [mesCumple, setMesCumple] = useState<string>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Apply filter from dashboard navigation state
  useEffect(() => {
    const state = location.state as any;
    if (state?.estadoFilter) {
      setEstadoFilter(state.estadoFilter.toLowerCase() === "inactivo" ? "Inactivo" : state.estadoFilter);
      // Clear state so refresh doesn't re-apply
      window.history.replaceState({}, "");
    }
  }, []);

  const norm = (s: any) =>
    String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const onlyDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
  const getPersonaTipos = (p: any) => {
    const tipos = [p.tipo_persona, ...(Array.isArray(p.tipos_persona) ? p.tipos_persona : [])]
      .filter(Boolean)
      .map((tipo: string) => String(tipo).trim());
    return [...new Set(tipos)];
  };
  const hasTipo = (p: any, tipo: string) => getPersonaTipos(p).some((t: string) => norm(t) === norm(tipo));

  const filtered = useMemo(() => {
    if (!personas) return [];
    const q = norm(search.trim());
    const qDigits = onlyDigits(search);
    return personas.filter((p: any) => {
      if (tipoFilter !== "Todos") {
        if (!hasTipo(p, tipoFilter)) return false;
      }
      if (estadoFilter !== "all" && p.estado_iglesia !== estadoFilter) return false;
      if (q) {
        const haystack = norm(
          `${p.nombres ?? ""} ${p.apellidos ?? ""} ${p.email ?? ""} ${p.documento ?? ""} ${p.ocupacion ?? ""} ${p.direccion ?? ""}`
        );
        const phones = `${onlyDigits(p.telefono)} ${onlyDigits(p.whatsapp)}`;
        const matchText = haystack.includes(q);
        const matchPhone = qDigits.length >= 3 && phones.includes(qDigits);
        if (!matchText && !matchPhone) return false;
      }
      return true;
    });
  }, [personas, search, tipoFilter, estadoFilter]);

  // Reset page on filter change
  const filterKey = `${search}-${tipoFilter}-${estadoFilter}`;
  useEffect(() => setPage(1), [filterKey]);

  const counts = useMemo(() => {
    if (!personas) return {} as Record<string, number>;
    const c: Record<string, number> = { total: personas.length };
    TIPOS.filter(t => t !== "Todos").forEach(t => {
      c[t] = personas.filter((p: any) => hasTipo(p, t)).length;
    });
    return c;
  }, [personas]);

  const handleDelete = async (id: string) => {
    try { await deletePersona.mutateAsync(id); toast.success("Persona eliminada"); }
    catch { toast.error("Error al eliminar"); }
  };

  const tableData = (personas || []).map(p => ({
    ...p,
    grupoNombre: (p as any).grupos?.nombre || "",
  }));

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Personas"
        description={
          activeRole === "consolidador_lider" ? "Toda la membresía — puedes crear y editar personas" :
          activeRole === "lider_red" ? "Personas de tu red" :
          "Gestión de miembros, visitantes, líderes y servidores"
        }
      >
        <ExportDropdown title="Personas" filename="personas" columns={[
          { header: "Nombres", key: "nombres" }, { header: "Apellidos", key: "apellidos" },
          { header: "Teléfono", key: "telefono" }, { header: "Email", key: "email" },
          { header: "Tipo", key: "tipo_persona" }, { header: "Grupo", key: "grupoNombre" },
          { header: "Estado", key: "estado_iglesia" },
        ]} data={tableData} />
        <ExportPersonasDialog />
        {canCreate && <ImportPersonasDialog />}
        {canCreate && <PersonaFormDialog />}
      </PageHeader>

      {canEdit && editing && <PersonaFormDialog initialData={editing} onClose={() => setEditing(null)} />}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total" value={counts.total || 0} icon={Users} />
        <MetricCard title="Miembros" value={counts["Miembro"] || 0} icon={Church} variant="default" />
        <MetricCard title="Visitantes" value={counts["Visitante"] || 0} icon={UserPlus} variant="info" />
        <MetricCard title="Discípulos" value={counts["Discípulo"] || 0} icon={Users} variant="accent" />
        <MetricCard title="Líderes CDP" value={counts["Líder Casa de Paz"] || 0} icon={Users} variant="success" />
        <MetricCard title="Líderes Red" value={counts["Líder de Red"] || 0} icon={Users} variant="accent" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, apellido, documento, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Inactivo">Inactivo</SelectItem>
            <SelectItem value="En proceso">En proceso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tipoFilter} onValueChange={setTipoFilter}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TIPOS.map(t => (
            <TabsTrigger key={t} value={t} className="text-xs">
              {t} ({t === "Todos" ? counts.total || 0 : counts[t] || 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Profile Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No se encontraron personas.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice((page - 1) * pageSize, page * pageSize).map((p: any) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer" onClick={() => navigate(`/personas/${p.id}`)}>
                <CardContent className="p-0">
                  <div className={`h-2 ${tipoColor[(p.tipos_persona?.[0] || p.tipo_persona)]?.includes("primary") ? "bg-primary" : tipoColor[(p.tipos_persona?.[0] || p.tipo_persona)]?.includes("info") ? "bg-info" : tipoColor[(p.tipos_persona?.[0] || p.tipo_persona)]?.includes("accent") ? "bg-accent" : "bg-success"}`} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`text-sm font-bold ${tipoColor[(p.tipos_persona?.[0] || p.tipo_persona)] || "bg-muted text-muted-foreground"}`}>
                          {p.nombres?.[0]}{p.apellidos?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.nombres} {p.apellidos}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {(() => {
                            const tipos = getPersonaTipos(p).length ? getPersonaTipos(p) : ["Miembro"];
                            return tipos.map((tipo: string) => (
                              <Badge key={tipo} variant="secondary" className={`text-[10px] ${tipoColor[tipo] || ""}`}>{tipo}</Badge>
                            ));
                          })()}
                          <StatusBadge status={p.estado_iglesia} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {p.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{p.telefono}</span>
                          <a
                            href={`https://web.whatsapp.com/send?phone=${(p.telefono || "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center text-success hover:text-success/80"
                            title="Enviar WhatsApp"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </a>
                        </div>
                      )}
                      {p.email && <div className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{p.email}</span></div>}
                      {(p as any).grupos?.nombre && <div className="flex items-center gap-2"><Users className="h-3 w-3" /> {(p as any).grupos.nombre}</div>}
                      {p.direccion && <div className="flex items-center gap-2 truncate"><MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{p.direccion}</span></div>}
                      {p.fecha_nacimiento && <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> {format(parseISO(p.fecha_nacimiento), "dd MMM yyyy", { locale: es })}</div>}
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditing({ ...p }); }}>
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                      )}
                      {canDelete && (
                        <div className="ml-auto" onClick={e => e.stopPropagation()}>
                          <DeleteConfirmDialog onConfirm={() => handleDelete(p.id)} title="¿Eliminar persona?" description={`Se eliminará a ${p.nombres} ${p.apellidos} permanentemente.`} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
              <p className="text-xs md:text-sm text-muted-foreground">
                {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1 md:gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-2 md:px-3">
                  <ChevronLeft className="h-4 w-4" /> <span className="hidden md:inline">Anterior</span>
                </Button>
                <span className="text-xs md:text-sm font-medium">
                  {page}/{Math.ceil(filtered.length / pageSize)}
                </span>
                <Button variant="outline" size="sm" disabled={page >= Math.ceil(filtered.length / pageSize)} onClick={() => setPage(p => p + 1)} className="h-8 px-2 md:px-3">
                  <span className="hidden md:inline">Siguiente</span> <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
