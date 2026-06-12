import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, GraduationCap } from "lucide-react";

export default function VerificarAcademicoPage() {
  const { id } = useParams<{ id: string }>();
  const sb = supabase as any;

  const { data, isLoading } = useQuery({
    queryKey: ["verificar-academico", id],
    queryFn: async () => {
      const { data: ins, error } = await sb.from("sem_inscripciones")
        .select("*, personas:persona_id(nombres,apellidos,documento), sem_programas:programa_id(nombre,codigo,total_semestres)")
        .eq("id", id).single();
      if (error) throw error;
      const { data: mats } = await sb.from("sem_inscripcion_materias")
        .select("*, sem_materias(codigo,nombre,creditos)")
        .eq("inscripcion_id", id);
      return { ins, mats: mats || [] };
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Verificando...</div>;
  if (!data?.ins) return (
    <div className="p-8 text-center">
      <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
      <p className="font-semibold">Registro no encontrado</p>
    </div>
  );

  const { ins, mats } = data;
  const aprob = mats.filter((m: any) => m.estado === "aprobada");
  const credAprob = aprob.reduce((s: number, c: any) => s + (c.sem_materias?.creditos || 0), 0);
  const totalCred = (ins.sem_programas?.total_semestres || 8) * 20;
  const completo = aprob.length >= mats.length && mats.length > 0 && credAprob >= totalCred * 0.95;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Iglesia Cristiana CMG — Seminario Bíblico</p>
              <p className="text-lg font-bold">Verificación de Historial Académico</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Estudiante:</span> <strong>{ins.personas?.nombres} {ins.personas?.apellidos}</strong></div>
            <div><span className="text-muted-foreground">Documento:</span> {ins.personas?.documento || "—"}</div>
            <div><span className="text-muted-foreground">Programa:</span> {ins.sem_programas?.nombre}</div>
            <div><span className="text-muted-foreground">Promedio:</span> {ins.promedio_acumulado ?? "—"}</div>
            <div><span className="text-muted-foreground">Créditos aprobados:</span> {credAprob} / {totalCred}</div>
            <div><span className="text-muted-foreground">Estado:</span> {completo
              ? <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Programa completado</Badge>
              : <Badge variant="outline">En curso</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-2">Materias cursadas ({mats.length})</p>
          <div className="space-y-1">
            {mats.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between text-xs border-b py-1.5">
                <div>
                  <span className="font-medium">{m.sem_materias?.codigo}</span> — {m.sem_materias?.nombre}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{m.estado}</Badge>
                  <span className="text-muted-foreground w-10 text-right">{m.nota_final ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
