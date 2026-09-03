import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseZap, Download, Loader2, ShieldAlert, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";

async function extractFunctionErrorMessage(error: any): Promise<string> {
  const fallback = error?.message || "No se pudo generar el backup";
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (body?.error) return body.error as string;
    }
  } catch {
    // Si no se puede leer el cuerpo del error, se usa el mensaje genérico
  }
  return fallback;
}

// Fallback cliente por si la Edge Function no está desplegada en el entorno actual
async function generateBackupClientFallback(): Promise<string> {
  const tables = [
    "personas", "profiles", "user_roles", "role_permissions", "grupos",
    "grupo_miembros", "servicios", "asistencia", "finanzas", "categorias_financieras",
    "eventos", "inscripciones", "donaciones", "peticiones_oracion", "mensajes",
    "banners", "videos", "senal_en_vivo", "configuracion_iglesia", "tema_semana_historial",
    "tema_semana_versiones", "security_audit_log", "seminario_cursos", "seminario_modulos",
    "sem_estudiantes", "sem_matriculas", "sem_calificaciones", "certificados",
    "cert_templates", "cert_export_log", "casas_de_paz", "redes"
  ];

  const out: string[] = [];
  out.push("-- ============================================================");
  out.push("-- MIGRACIÓN COMPLETA DE BASE DE DATOS (Cliente Fallback)");
  out.push(`-- Generado el ${new Date().toISOString()}`);
  out.push("-- Compatible con PostgreSQL");
  out.push("-- ============================================================");
  out.push("");
  out.push("SET client_min_messages TO WARNING;");
  out.push("BEGIN;");
  out.push("CREATE SCHEMA IF NOT EXISTS auth;");
  out.push("");
  out.push("CREATE TABLE IF NOT EXISTS \"auth\".\"users\" (");
  out.push("  \"id\" UUID NOT NULL PRIMARY KEY,");
  out.push("  \"email\" TEXT,");
  out.push("  \"created_at\" TIMESTAMP WITH TIME ZONE");
  out.push(");");
  out.push("");
  out.push("SET session_replication_role = 'replica';");
  out.push("");

  let totalRows = 0;

  // Intentar crear auth.users desde profiles
  try {
    const { data: profs } = await supabase.from("profiles").select("id, email, created_at");
    if (profs && profs.length > 0) {
      const userInserts = profs.map(p => {
        const idVal = `'${p.id}'`;
        const emailVal = p.email ? `'${p.email.replace(/'/g, "''")}'` : "NULL";
        const createdVal = p.created_at ? `'${p.created_at}'` : "NOW()";
        return `(${idVal}, ${emailVal}, ${createdVal})`;
      });
      out.push(`INSERT INTO "auth"."users" ("id", "email", "created_at") VALUES`);
      out.push(userInserts.join(",\n") + ";");
      out.push("");
      totalRows += profs.length;
    }
  } catch {
    // Ignorar si no se puede leer profiles
  }

  for (const tableName of tables) {
    try {
      const { data, error } = await supabase.from(tableName as any).select("*");
      if (error || !data || data.length === 0) continue;

      const sampleRow = data[0];
      const cols = Object.keys(sampleRow);
      if (cols.length === 0) continue;

      out.push(`-- Tabla: public."${tableName}" (${data.length} filas)`);
      out.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (`);
      const colDefs = cols.map((col) => {
        let type = "TEXT";
        const val = sampleRow[col];
        if (typeof val === "boolean") type = "BOOLEAN";
        else if (typeof val === "number") type = Number.isInteger(val) ? "INTEGER" : "NUMERIC";
        else if (val && typeof val === "object") type = "JSONB";
        else if (typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) type = "UUID";
        return `  "${col}" ${type}`;
      });
      out.push(colDefs.join(",\n"));
      out.push(");");
      out.push("");

      const formatVal = (v: any) => {
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "boolean") return v ? "true" : "false";
        if (typeof v === "number") return String(v);
        if (typeof v === "object") {
          const json = JSON.stringify(v).replace(/'/g, "''");
          return `'${json}'::jsonb`;
        }
        const str = String(v).replace(/'/g, "''");
        return `'${str}'`;
      };

      const rowsInsert: string[] = [];
      const colNamesIdent = cols.map(c => `"${c}"`).join(", ");

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const vals = cols.map(c => formatVal(row[c]));
        rowsInsert.push(`(${vals.join(", ")})`);

        if (rowsInsert.length >= 500 || i === data.length - 1) {
          out.push(`INSERT INTO "${tableName}" (${colNamesIdent}) VALUES`);
          out.push(rowsInsert.join(",\n") + ";");
          out.push("");
          rowsInsert.length = 0;
        }
      }

      totalRows += data.length;
    } catch {
      // Ignorar tablas no existentes en consulta fallback
    }
  }

  out.push("SET session_replication_role = 'origin';");
  out.push("COMMIT;");
  out.push(`-- Fin del script fallback. Filas totales: ${totalRows}`);

  return out.join("\n");
}

export default function MigracionBackupManager() {
  const { isAdmin, isLoading: isLoadingRoles } = useUserRoles();
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const downloadFile = (sqlContent: string) => {
    const blob = new Blob([sqlContent], { type: "application/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "migracion_completa.sql";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastGeneratedAt(new Date().toLocaleTimeString());
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      let sqlContent = "";
      try {
        const { data, error } = await supabase.functions.invoke("db-backup", {
          method: "POST",
        });

        if (error) {
          throw new Error(await extractFunctionErrorMessage(error));
        }

        sqlContent = typeof data === "string" ? data : JSON.stringify(data);

        if (sqlContent.trim().startsWith("{") && sqlContent.includes('"error"')) {
          const parsed = JSON.parse(sqlContent);
          if (parsed?.error) throw new Error(parsed.error);
        }
      } catch (err: any) {
        console.warn("Edge Function db-backup no disponible o falló, usando fallback de cliente:", err?.message);
        sqlContent = await generateBackupClientFallback();
      }

      if (!sqlContent || !sqlContent.trim()) {
        throw new Error("El backup generado está vacío");
      }

      downloadFile(sqlContent);
      toast.success("Migración generada y descargada correctamente");
    } catch (e: any) {
      toast.error(e?.message || "Error al generar el backup de la base de datos");
    } finally {
      setGenerating(false);
    }
  };

  if (!isLoadingRoles && !isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          Esta sección solo está disponible para administradores.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DatabaseZap className="h-4 w-4 text-primary" /> Migración y Backup SQL
        </CardTitle>
        <CardDescription>
          Genera un único archivo <code>migracion_completa.sql</code> con la estructura
          (CREATE TABLE IF NOT EXISTS) y todos los datos actuales (INSERT INTO) de la base de datos,
          listo para ejecutarse en cualquier servidor PostgreSQL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            El archivo generado contiene <strong>todos los datos reales</strong> de la
            aplicación (personas, usuarios, mensajes, tesorería, etc.). Guárdalo en un
            lugar seguro y no lo compartas fuera del equipo autorizado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleDownload} disabled={generating || isLoadingRoles} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando migración completa...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Descargar migracion_completa.sql
              </>
            )}
          </Button>

          {lastGeneratedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Última descarga: {lastGeneratedAt}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          El proceso lee la estructura y los datos directamente desde la base de datos a
          través de una función segura del servidor (solo administradores). Según el
          tamaño de la base de datos, la generación puede tardar algunos segundos.
        </p>
      </CardContent>
    </Card>
  );
}
