import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BookOpen, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  semestres: any[];
  pensum: any[];
  cursando: any[];
  semestreActual: number;
}

export default function ProgresoPanel({ semestres, pensum, cursando, semestreActual }: Props) {
  const matsBySem = useMemo(() => {
    const m: Record<number, any[]> = {};
    (pensum || []).forEach((p: any) => {
      const n = p.sem_pensum_semestres?.numero;
      if (!n) return;
      (m[n] = m[n] || []).push(p.sem_materias);
    });
    return m;
  }, [pensum]);

  const map = new Map((cursando || []).map((c: any) => [c.materia_id, c]));

  const data = (semestres || []).map((s: any) => {
    const mats = matsBySem[s.numero] || [];
    const total = mats.reduce((a, m) => a + (m.creditos || 0), 0);
    const aprob = mats.reduce((a, m) => {
      const c: any = map.get(m.id);
      return a + (c?.estado === "aprobada" ? (m.creditos || 0) : 0);
    }, 0);
    return { name: `S${s.numero}`, Aprobados: aprob, Pendientes: total - aprob, numero: s.numero, total };
  });

  const enProgreso = (cursando || []).filter((c: any) => c.estado === "cursando");
  const reprobadas = (cursando || []).filter((c: any) => c.estado === "reprobada");

  // Alertas: semestres anteriores al actual con materias sin aprobar
  const semestresVencidos = data.filter(d => d.numero < semestreActual && d.Aprobados < d.total);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Panel de avance</p>
          <div className="flex gap-1">
            <Badge variant="outline" className="gap-1 text-[10px]"><BookOpen className="h-3 w-3" />{enProgreso.length} cursando</Badge>
            {reprobadas.length > 0 && <Badge variant="destructive" className="text-[10px]">{reprobadas.length} reprobadas</Badge>}
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Aprobados" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Pendientes" stackId="a" fill="hsl(var(--muted))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {semestresVencidos.length > 0 && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Semestres con materias pendientes</p>
              <p className="text-[11px] text-muted-foreground">
                {semestresVencidos.map(s => `S${s.numero} (${s.Aprobados}/${s.total} cr)`).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {enProgreso.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Materias en progreso</p>
            <div className="flex flex-wrap gap-1">
              {enProgreso.map((c: any) => (
                <Badge key={c.id} variant="secondary" className="text-[10px]" style={{ background: `${c.sem_materias?.color}20`, color: c.sem_materias?.color }}>
                  {c.sem_materias?.codigo}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
