import { useState } from "react";
import { useCertificadosSeminario, useEmitirDiploma, useProgramas } from "@/hooks/useSeminario";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { exportKardexPdf } from "@/lib/seminarioPdf";
import { logSemAudit } from "@/lib/seminarioAudit";

const sb = supabase as any;

function useElegiblesDiploma(programaId?: string) {
  return useQuery({
    queryKey: ["sem-elegibles-diploma", programaId],
    queryFn: async () => {
      if (!programaId) return [];
      const { data, error } = await sb.from("sem_inscripciones")
        .select("id, persona_id, programa_id, promedio_acumulado, total_creditos_aprobados, estado, personas(id, nombres, apellidos, documento)")
        .eq("programa_id", programaId)
        .eq("estado", "completado");
      if (error) throw error;
      return data || [];
    },
    enabled: !!programaId,
  });
}

export default function CertificadosSection() {
  const can = useCan();
  const canCert = can("seminario:certificar");
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || (programas as any[])?.[0]?.id || "";
  const { data: certs } = useCertificadosSeminario();
  const { data: elegibles } = useElegiblesDiploma(effProg);
  const emitir = useEmitirDiploma();
  const [q, setQ] = useState("");

  const filtered = (certs || []).filter((c: any) => {
    const n = `${c.personas?.nombres || ""} ${c.personas?.apellidos || ""}`.toLowerCase();
    return !q || n.includes(q.toLowerCase()) || c.codigo?.toLowerCase().includes(q.toLowerCase());
  });

  const handleEmitir = async (insc: any) => {
    try {
      const res: any = await emitir.mutateAsync({ persona_id: insc.persona_id, programa_id: insc.programa_id });
      await logSemAudit({ action: "certificado.generado", persona_id: insc.persona_id, details: { codigo: res?.codigo, tipo: "seminario_diploma" } });
      toast.success(`Diploma emitido: ${res?.codigo}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDescargar = async (c: any) => {
    try {
      const { data: insc } = await sb.from("sem_inscripciones")
        .select("id, promedio_acumulado, total_creditos_aprobados, programa_id, sem_programas(nombre)")
        .eq("persona_id", c.persona_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: ims } = await sb.from("sem_inscripcion_materias")
        .select("estado, nota_final, sem_materias(codigo, nombre, creditos, semestre)")
        .eq("inscripcion_id", insc?.id);
      const rows = (ims || []).map((x: any) => ({
        semestre: x.sem_materias?.semestre ?? 0,
        codigo: x.sem_materias?.codigo ?? "",
        nombre: x.sem_materias?.nombre ?? "",
        creditos: x.sem_materias?.creditos ?? 0,
        estado: x.estado, nota_final: x.nota_final,
      }));
      const totalCred = rows.reduce((a: number, r: any) => a + (r.creditos || 0), 0);
      await exportKardexPdf({
        estudiante: `${c.personas?.nombres || ""} ${c.personas?.apellidos || ""}`.trim(),
        documento: c.personas?.documento,
        programa: insc?.sem_programas?.nombre || "Seminario",
        promedio: Number(insc?.promedio_acumulado || 0).toFixed(2),
        creditosAprobados: insc?.total_creditos_aprobados || 0,
        creditosTotales: totalCred,
        rows, certificado: true, inscripcionId: insc?.id,
      });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Award className="h-5 w-5" />Diplomas Seminario</h2>
          <p className="text-xs text-muted-foreground">Emisión y descarga de diplomas con código de verificación</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-8 w-56" />
          </div>
        </div>
      </div>

      {/* Elegibles */}
      {canCert && (elegibles?.length || 0) > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="font-semibold text-sm">Estudiantes elegibles para diploma ({elegibles?.length})</p>
            </div>
            <div className="space-y-1">
              {(elegibles || []).map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.personas?.nombres} {e.personas?.apellidos}</p>
                    <p className="text-[10px] text-muted-foreground">{e.personas?.documento} · Promedio {Number(e.promedio_acumulado || 0).toFixed(2)} · {e.total_creditos_aprobados} cr</p>
                  </div>
                  <Button size="sm" onClick={() => handleEmitir(e)} disabled={emitir.isPending}>
                    <Award className="h-4 w-4 mr-1" />Emitir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aún no se ha emitido ningún diploma</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((c: any) => (
                <div key={c.id} className="p-3 flex items-center gap-3">
                  <Award className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.personas?.nombres} {c.personas?.apellidos}</p>
                    <p className="text-[10px] text-muted-foreground">{c.personas?.documento}</p>
                  </div>
                  <Badge variant="outline">{c.codigo}</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{c.fecha_emision}</span>
                  <Button size="sm" variant="outline" onClick={() => handleDescargar(c)}>
                    <Download className="h-4 w-4 mr-1" />PDF
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
