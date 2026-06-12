import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useMiPersona, useMisOfertas, useIsSeminarioStaff } from "@/hooks/useSeminarioStudent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

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

  return (
    <Card className="border-dashed" data-testid="aula-diagnostic">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Diagnóstico del Aula Virtual
            {!user && <Badge variant="destructive" className="text-[10px] ml-2">Sin sesión</Badge>}
            {user && !persona.data && !persona.isLoading && <Badge variant="destructive" className="text-[10px] ml-2">Sin ficha</Badge>}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {open && (
          <div className="space-y-0.5">
            <Row label="Sesión" ok={!!user} value={user?.email || "no autenticado"} />
            <Row label="Roles" ok={!rolesLoading && (roles?.length || 0) > 0} value={(roles || []).join(", ") || "ninguno"} />
            <Row label="Es staff" ok={!!staff} value={staff ? "sí" : "no"} />
            <Row label="Persona vinculada" ok={!!persona.data} value={persona.data ? `${persona.data.nombres} ${persona.data.apellidos} (${persona.data.id})` : persona.error?.message || (persona.isLoading ? "cargando..." : `Sin coincidencia para ${user?.email}`)} />
            <Row label="Materias matriculadas" ok={(ofertas.data?.length || 0) > 0} value={ofertas.error?.message || `${ofertas.data?.length ?? 0} cursos`} />
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
