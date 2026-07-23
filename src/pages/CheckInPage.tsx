import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Church, CheckCircle2, AlertTriangle, Loader2, Clock } from "lucide-react";

const PUNT_COLOR: Record<string, string> = {
  "Excelente": "bg-success/15 text-success",
  "Puntual": "bg-success/15 text-success",
  "Tarde leve": "bg-amber-500/15 text-amber-700",
  "Tarde": "bg-orange-500/15 text-orange-700",
  "Muy tarde": "bg-destructive/15 text-destructive",
};

export default function CheckInPage() {
  const { servicioId } = useParams<{ servicioId: string }>();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [servicio, setServicio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "already" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    if (!servicioId) return;
    supabase.from("servicios").select("id, nombre, fecha, hora, qr_activo, qr_expires_at").eq("id", servicioId).maybeSingle()
      .then(({ data }) => { setServicio(data); setLoading(false); });
  }, [servicioId]);

  const doCheckIn = useCallback(async () => {
    if (!servicioId || !token) {
      setStatus("error");
      setMessage("Este enlace de check-in no es válido. Solicita un QR actualizado al líder de la reunión.");
      return;
    }
    setStatus("checking");
    const { data, error } = await supabase.rpc("checkin_qr", {
      _servicio_id: servicioId,
      _token: token,
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    const payload = data as any;
    if (!payload?.ok) {
      setStatus("error");
      setMessage(payload?.message || "No se pudo registrar la asistencia.");
      return;
    }
    setResult(payload);
    if (payload.code === "already") {
      setStatus("already");
      setMessage("Ya registraste tu asistencia.");
    } else {
      setStatus("success");
      setMessage(payload.message || "¡Asistencia registrada!");
    }
  }, [servicioId, token]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const isAuthed = !!session?.user;
      setAuthed(isAuthed);
      if (isAuthed && servicioId && token) {
        await doCheckIn();
      }
    });
  }, [servicioId, token, doCheckIn]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-foreground font-semibold">Reunión no encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Church className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{servicio.nombre}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {servicio.fecha} {servicio.hora ? `· ${servicio.hora}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authed && status === "idle" && (
            <>
              <p className="text-sm text-center text-muted-foreground">
                Inicia sesión con tu cuenta de DOXA para registrar tu asistencia.
              </p>
              <Button className="w-full" size="lg" onClick={handleLogin}>
                Iniciar sesión con Google
              </Button>
            </>
          )}

          {status === "checking" && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Registrando asistencia…</p>
            </div>
          )}

          {(status === "success" || status === "already") && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <p className="text-foreground font-semibold text-lg">
                {status === "already" ? "Ya registraste tu asistencia" : "¡Asistencia registrada!"}
              </p>
              {result?.nombre && <p className="text-sm">{result.nombre}</p>}
              {result?.puntualidad && (
                <Badge className={PUNT_COLOR[result.puntualidad] || ""}>
                  <Clock className="h-3 w-3 mr-1" /> {result.puntualidad}
                </Badge>
              )}
              {result?.checkin_time && (
                <p className="text-xs text-muted-foreground">
                  {new Date(result.checkin_time).toLocaleString("es-CO")}
                </p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-foreground">{message}</p>
              {authed && (
                <Button variant="outline" className="mt-4" onClick={doCheckIn}>
                  Intentar de nuevo
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
