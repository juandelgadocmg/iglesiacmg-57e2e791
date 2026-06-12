import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, GraduationCap, Copy, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function VerificarAcademicoPage() {
  const { id } = useParams<{ id: string }>();
  const sb = supabase as any;

  const { data, isLoading, isError } = useQuery({
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

  const verifyUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success("Enlace copiado");
    } catch { toast.error("No se pudo copiar"); }
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Verificando...</div>;

  const invalid = isError || !data?.ins;
  if (invalid) return (
    <div className="max-w-xl mx-auto p-6 md:p-10">
      <Card className="border-destructive">
        <CardContent className="p-8 text-center space-y-3">
          <ShieldAlert className="h-14 w-14 text-destructive mx-auto" />
          <Badge variant="destructive" className="text-sm"><XCircle className="h-3 w-3 mr-1" />Verificación inválida</Badge>
          <p className="font-semibold">Registro académico no encontrado</p>
          <p className="text-xs text-muted-foreground">El identificador proporcionado no corresponde a una inscripción válida del Seminario Bíblico CMG.</p>
          <Button size="sm" variant="outline" onClick={handleCopy}><Copy className="h-3.5 w-3.5 mr-1" />Copiar enlace</Button>
        </CardContent>
      </Card>
    </div>
  );

  const { ins, mats } = data!;
  const aprob = mats.filter((m: any) => m.estado === "aprobada");
  const credAprob = aprob.reduce((s: number, c: any) => s + (c.sem_materias?.creditos || 0), 0);
  const totalCred = (ins.sem_programas?.total_semestres || 8) * 20;
  const completo = aprob.length >= mats.length && mats.length > 0 && credAprob >= totalCred * 0.95;
  const pct = totalCred > 0 ? Math.round((credAprob / totalCred) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-4">
      {/* Status banner */}
      <Card className={completo ? "border-green-600/40 bg-green-50/40 dark:bg-green-950/20" : "border-primary/30"}>
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          {completo ? (
            <ShieldCheck className="h-12 w-12 text-green-600" />
          ) : (
            <ShieldCheck className="h-12 w-12 text-primary" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {completo
                ? <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Certificado válido</Badge>
                : <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Inscripción vigente</Badge>}
              <Badge variant="outline" className="text-[10px]">ID {String(ins.id).slice(0, 8)}</Badge>
            </div>
            <p className="text-sm font-semibold">{ins.personas?.nombres} {ins.personas?.apellidos}</p>
            <p className="text-xs text-muted-foreground">
              {ins.sem_programas?.nombre} · {aprob.length}/{mats.length} materias · {credAprob}/{totalCred} créditos ({pct}%)
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1" />Copiar enlace
          </Button>
        </CardContent>
      </Card>

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

      <p className="text-[10px] text-center text-muted-foreground">
        Verificación generada automáticamente · {new Date().toLocaleString("es-CO")}
      </p>
    </div>
  );
}
