import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useMiPersona, useMisOfertas, useIsSeminarioStaff } from "@/hooks/useSeminarioStudent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, ChevronDown, ChevronUp, Download } from "lucide-react";

function Row({ label, ok, value }: { label: string; ok: boolean; value?: any }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 border-b last:border-b-0 text-xs">
      <span className="font-medium flex items-center gap-1.5">
        {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
        {label}
      </span>
      <span className="text-right text-muted-foreground break-all max-w-[60%]">{String(value ?? "—")}</span>
    </div>
  );
}

export default function AulaDiagnosticPanel() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRoles() as any;
  const persona = useMiPersona();
  const { data: staff } = useIsSeminarioStaff();
  const ofertas = useMisOfertas(persona.data?.id);

  // Inscripciones / filtros aplicados a recursos, foros y materiales
  const matriculaInfo = useMemo(() => {
    const items = (ofertas.data || []) as any[];
    const activos = items.filter((im) => ["activa", "en_curso", "matriculada"].includes((im.estado || "").toLowerCase()));
    const programas = new Set(items.map((im) => im.sem_inscripciones?.sem_programas?.nombre).filter(Boolean));
    const periodos = new Set(items.map((im) => im.sem_ofertas?.sem_periodos?.nombre).filter(Boolean));
    const materias = items.map((im) => ({
      materia: `${im.sem_materias?.codigo} · ${im.sem_materias?.nombre}`,
      periodo: im.sem_ofertas?.sem_periodos?.nombre,
      estado: im.estado,
      oferta_id: im.oferta_id,
      materia_id: im.materia_id,
      periodo_id: im.sem_ofertas?.periodo_id,
      inscripcion_materia_id: im.id,
    }));
    return { activos: activos.length, total: items.length, programas: [...programas], periodos: [...periodos], materias };
  }, [ofertas.data]);

  const report = useMemo(() => {
    const lines: string[] = [];
    lines.push("=== Diagnóstico Aula Virtual CMG ===");
    lines.push(`Generado: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("[Sesión]");
    lines.push(`user_id: ${user?.id || "—"}`);
    lines.push(`email:   ${user?.email || "—"}`);
    lines.push("");
    lines.push("[Roles]");
    lines.push(`roles:   ${(roles || []).join(", ") || "ninguno"}`);
    lines.push(`is_staff: ${staff ? "sí" : "no"}`);
    lines.push("");
    lines.push("[Persona]");
    lines.push(`persona_id: ${persona.data?.id || "—"}`);
    lines.push(`nombre:     ${persona.data ? `${persona.data.nombres} ${persona.data.apellidos}` : "—"}`);
    lines.push(`documento:  ${persona.data?.documento || "—"}`);
    if (persona.error) lines.push(`error:      ${(persona.error as any).message}`);
    lines.push("");
    lines.push("[Matrículas / Filtros]");
    lines.push(`total cursos:     ${matriculaInfo.total}`);
    lines.push(`cursos activos:   ${matriculaInfo.activos}`);
    lines.push(`programas:        ${matriculaInfo.programas.join(" | ") || "—"}`);
    lines.push(`periodos:         ${matriculaInfo.periodos.join(" | ") || "—"}`);
    if (ofertas.error) lines.push(`error ofertas:    ${(ofertas.error as any).message}`);
    lines.push("");
    lines.push("[Materias usadas para filtrar recursos, foros y materiales]");
    matriculaInfo.materias.forEach((m, i) => {
      lines.push(`#${i + 1} ${m.materia}`);
      lines.push(`   periodo=${m.periodo || "—"}  estado=${m.estado}`);
      lines.push(`   oferta_id=${m.oferta_id}  materia_id=${m.materia_id}`);
      lines.push(`   periodo_id=${m.periodo_id || "—"}  inscripcion_materia_id=${m.inscripcion_materia_id}`);
    });
    return lines.join("\n");
  }, [user, roles, staff, persona.data, persona.error, ofertas.error, matriculaInfo]);

  const download = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aula-diagnostico-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-dashed" data-testid="aula-diagnostic">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium flex items-center gap-1.5 flex-wrap">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>Diagnóstico del Aula Virtual</span>
            {!user && <Badge variant="destructive" className="text-[10px] ml-2">Sin sesión</Badge>}
            {user && !persona.data && !persona.isLoading && <Badge variant="destructive" className="text-[10px] ml-2">Sin ficha</Badge>}
            {persona.data && matriculaInfo.total === 0 && <Badge variant="secondary" className="text-[10px] ml-2">Sin matrículas</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={download} data-testid="aula-diagnostic-export">
              <Download className="h-3.5 w-3.5 mr-1" />Exportar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} data-testid="aula-diagnostic-toggle">
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        {open && (
          <div className="space-y-0.5" data-testid="aula-diagnostic-body">
            <Row label="Sesión" ok={!!user} value={user?.email || "no autenticado"} />
            <Row label="user_id" ok={!!user?.id} value={user?.id} />
            <Row label="Rol detectado" ok={!rolesLoading && (roles?.length || 0) > 0} value={(roles || []).join(", ") || "ninguno"} />
            <Row label="Es staff (RLS)" ok={!!staff} value={staff ? "sí" : "no"} />
            <Row
              label="persona_id"
              ok={!!persona.data}
              value={persona.data ? `${persona.data.id} · ${persona.data.nombres} ${persona.data.apellidos}` : (persona.error as any)?.message || (persona.isLoading ? "cargando..." : `Sin coincidencia para ${user?.email}`)}
            />
            <Row label="Programas inscritos" ok={matriculaInfo.programas.length > 0} value={matriculaInfo.programas.join(" | ")} />
            <Row label="Periodos activos" ok={matriculaInfo.periodos.length > 0} value={matriculaInfo.periodos.join(" | ")} />
            <Row label="Cursos (matrículas)" ok={matriculaInfo.total > 0} value={`${matriculaInfo.activos} activos / ${matriculaInfo.total} totales`} />
            {matriculaInfo.materias.length > 0 && (
              <details className="text-[11px] pt-2">
                <summary className="cursor-pointer text-muted-foreground">Ver IDs usados para filtrar recursos/foros/materiales ({matriculaInfo.materias.length})</summary>
                <ul className="mt-1 space-y-1">
                  {matriculaInfo.materias.map((m, i) => (
                    <li key={i} className="border rounded p-1.5 bg-muted/30">
                      <p className="font-medium">{m.materia} <span className="text-muted-foreground">· {m.estado}</span></p>
                      <p className="text-[10px] text-muted-foreground break-all">
                        oferta={m.oferta_id} · materia={m.materia_id} · periodo={m.periodo_id || "—"} · im={m.inscripcion_materia_id}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {(persona.error || ofertas.error) && (
              <p className="text-[10px] text-destructive pt-1">
                Si ves errores de permisos, revisa que tu rol tenga acceso al seminario y que tu correo coincida con tu ficha de estudiante.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
