import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserCheck, History, Users, Activity, ExternalLink } from "lucide-react";

export type KpiDetailType = "discipulos" | "lideres" | "visitas" | "consolidados" | null;

interface KpiDetailsModalProps {
  open: boolean;
  onClose: () => void;
  type: KpiDetailType;
  discipulos: any[];
  lideres: any[];
  visitas: any[];
  casasDict: Record<string, string>;
  lideresDict: Record<string, string>;
  discipulosDict: Record<string, string>;
  onSelectDiscipulo?: (discipulo: any) => void;
  onOpenFullTab?: (tab: string, filter?: string) => void;
}

export function KpiDetailsModal({
  open,
  onClose,
  type,
  discipulos = [],
  lideres = [],
  visitas = [],
  casasDict = {},
  lideresDict = {},
  discipulosDict = {},
  onSelectDiscipulo,
  onOpenFullTab,
}: KpiDetailsModalProps) {
  const [search, setSearch] = useState("");

  const activeLeadersList = useMemo(() => {
    const countsByLeader = new Map<string, number>();
    const sampleCasaByLeader = new Map<string, string>();

    for (const d of discipulos) {
      if (!d.lider_id) continue;
      countsByLeader.set(d.lider_id, (countsByLeader.get(d.lider_id) || 0) + 1);
      if (d.casa_de_paz_id && !sampleCasaByLeader.has(d.lider_id)) {
        sampleCasaByLeader.set(d.lider_id, d.casa_de_paz_id);
      }
    }

    const list: Array<{
      id: string;
      full_name: string;
      email: string;
      phone: string;
      casaName: string;
      discipulosCount: number;
    }> = [];

    countsByLeader.forEach((count, leaderId) => {
      const lObj = lideres.find((l) => l.id === leaderId);
      const casaId = lObj?.casa_de_paz_id || sampleCasaByLeader.get(leaderId) || "";
      list.push({
        id: leaderId,
        full_name: lObj?.full_name || lideresDict[leaderId] || "Líder asignado",
        email: lObj?.email || "",
        phone: lObj?.phone || "",
        casaName: (casaId && casasDict[casaId]) || "Sin Casa asignada",
        discipulosCount: count,
      });
    });

    return list.sort((a, b) => b.discipulosCount - a.discipulosCount);
  }, [discipulos, lideres, casasDict, lideresDict]);

  const enrichedVisitas = useMemo(() => {
    return visitas.map((v) => {
      const disc = discipulos.find((d) => d.id === v.discipulo_id);
      const casaId = disc?.casa_de_paz_id;
      return {
        ...v,
        discipuloNombre: discipulosDict[v.discipulo_id] || disc?.full_name || "Discípulo",
        liderNombre:
          lideresDict[v.lider_id] ||
          (disc?.lider_id ? lideresDict[disc.lider_id] : "") ||
          "Líder",
        casaNombre: (casaId && casasDict[casaId]) || "Sin Casa",
      };
    });
  }, [visitas, discipulos, discipulosDict, lideresDict, casasDict]);

  const consolidadosList = useMemo(
    () => discipulos.filter((d) => d.status === "Completado"),
    [discipulos]
  );

  const term = search.trim().toLowerCase();

  const headerMeta = useMemo(() => {
    switch (type) {
      case "lideres":
        return {
          title: "Líderes con Asignaciones",
          description: `${activeLeadersList.length} líder(es) tienen discípulos asignados actualmente.`,
          icon: <UserCheck className="w-5 h-5 text-red-600" />,
        };
      case "visitas":
        return {
          title: "Visitas Pastorales Registradas",
          description: `${enrichedVisitas.length} visita(s) registrada(s) en el módulo de discipulado.`,
          icon: <History className="w-5 h-5 text-red-600" />,
        };
      case "consolidados":
        return {
          title: "Discípulos Consolidados",
          description: `${consolidadosList.length} discípulo(s) con proceso completado.`,
          icon: <Activity className="w-5 h-5 text-red-600" />,
        };
      default:
        return {
          title: "Discípulos Totales",
          description: `${discipulos.length} discípulo(s) registrados en el sistema.`,
          icon: <Users className="w-5 h-5 text-red-600" />,
        };
    }
  }, [type, activeLeadersList.length, enrichedVisitas.length, consolidadosList.length, discipulos.length]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
            {headerMeta.icon}
            {headerMeta.title}
          </DialogTitle>
          <DialogDescription>{headerMeta.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nombre, casa de paz o detalle..."
                className="pl-9"
              />
            </div>
            {type === "visitas" && onOpenFullTab && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  onClose();
                  onOpenFullTab("interacciones", "Visita");
                }}
              >
                Ver en Historial <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            {(type === "discipulos" || type === "consolidados") && onOpenFullTab && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  onClose();
                  onOpenFullTab("listado", type === "consolidados" ? "Consolidados" : "Todos");
                }}
              >
                Ver en Tabla de Procesos <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[420px] border rounded-xl">
            {type === "lideres" && (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Líder</th>
                    <th className="px-4 py-3">Casa de Paz</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3 text-right">Discípulos Asignados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeLeadersList
                    .filter(
                      (l) =>
                        !term ||
                        l.full_name.toLowerCase().includes(term) ||
                        l.casaName.toLowerCase().includes(term)
                    )
                    .map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-800">{l.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">{l.casaName}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {l.phone || l.email || "Sin datos"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge className="bg-red-100 text-red-700 border-0 font-bold">
                            {l.discipulosCount} discípulos
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  {activeLeadersList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No hay líderes con discípulos asignados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {type === "visitas" && (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Discípulo Visitado</th>
                    <th className="px-4 py-3">Líder</th>
                    <th className="px-4 py-3">Casa de Paz</th>
                    <th className="px-4 py-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedVisitas
                    .filter(
                      (v) =>
                        !term ||
                        v.discipuloNombre.toLowerCase().includes(term) ||
                        v.liderNombre.toLowerCase().includes(term) ||
                        v.casaNombre.toLowerCase().includes(term) ||
                        (v.notas || v.descripcion || "").toLowerCase().includes(term)
                    )
                    .map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                          {v.fecha}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {v.discipuloNombre}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{v.liderNombre}</td>
                        <td className="px-4 py-3 text-slate-600">{v.casaNombre}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {v.notas || v.descripcion || v.lugar || "Visita pastoral registrada"}
                        </td>
                      </tr>
                    ))}
                  {enrichedVisitas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No hay visitas registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {(type === "discipulos" || type === "consolidados") && (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Discípulo</th>
                    <th className="px-4 py-3">Líder</th>
                    <th className="px-4 py-3">Casa de Paz</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(type === "consolidados" ? consolidadosList : discipulos)
                    .filter((d) => {
                      if (!term) return true;
                      const lidName = lideresDict[d.lider_id] || "";
                      const cName = casasDict[d.casa_de_paz_id] || "";
                      return (
                        (d.full_name || "").toLowerCase().includes(term) ||
                        lidName.toLowerCase().includes(term) ||
                        cName.toLowerCase().includes(term)
                      );
                    })
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-800">{d.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {lideresDict[d.lider_id] || "Sin asignar"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(d.casa_de_paz_id && casasDict[d.casa_de_paz_id]) || "Sin casa"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {d.status || "Activo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {onSelectDiscipulo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-600 font-bold"
                              onClick={() => {
                                onClose();
                                onSelectDiscipulo(d);
                              }}
                            >
                              Ver Proceso
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
