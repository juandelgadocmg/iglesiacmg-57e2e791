import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props { servicioId?: string | null; }

export default function PlanillaHistorialSection({ servicioId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["planilla_historial", servicioId],
    queryFn: async () => {
      if (!servicioId) return [];
      const { data, error } = await supabase
        .from("planilla_historial")
        .select("*")
        .eq("servicio_id", servicioId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!servicioId,
  });

  if (!servicioId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Historial de planillas generadas
        </CardTitle>
        <CardDescription>Registro de cada vez que se generó una planilla para esta reunión.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aún no se ha generado ninguna planilla.</p>
        ) : (
          <div className="divide-y">
            {data.map((h: any) => {
              const p = h.parametros || {};
              const cols: string[] = Array.isArray(p.columnas) ? p.columnas : [];
              return (
                <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.titulo || "Planilla"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(h.created_at).toLocaleString("es-CO")} · {h.generada_por_email || "usuario"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{h.total_asistentes}/{h.total_personas} · {h.tasa_asistencia}%</Badge>
                    {cols.map(c => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
