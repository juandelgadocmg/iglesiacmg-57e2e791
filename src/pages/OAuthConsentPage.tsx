import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

// Local typed wrapper for the beta supabase.auth.oauth namespace
type OAuthDetails = {
  client?: { name?: string; client_name?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Falta el parámetro authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setAccount(sess.session.user.email ?? sess.session.user.id);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió una URL de redirección.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "una aplicación";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="CMG" className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <h1 className="text-lg font-bold">CMG Admin</h1>
            <p className="text-xs text-muted-foreground">Autorizar acceso</p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded p-3">
            No se pudo cargar esta solicitud: {error}
          </div>
        )}

        {!error && !details && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}

        {details && (
          <>
            <div className="space-y-2">
              <h2 className="text-base font-semibold">
                Conectar <span className="text-primary">{clientName}</span> a tu cuenta
              </h2>
              <p className="text-sm text-muted-foreground">
                Esto permite que <strong>{clientName}</strong> use CMG Admin como tú.
                Las herramientas expuestas respetan tus permisos y roles.
              </p>
              {account && (
                <p className="text-xs text-muted-foreground">
                  Cuenta: <strong>{account}</strong>
                </p>
              )}
              {details.client?.redirect_uri && (
                <p className="text-xs text-muted-foreground break-all">
                  Redirección: {details.client.redirect_uri}
                </p>
              )}
            </div>

            <div className="text-xs text-muted-foreground border-t pt-4">
              Esto no elude las políticas de seguridad de la plataforma. El acceso a datos
              sigue controlado por tus permisos.
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={busy}
                onClick={() => decide(true)}
              >
                Aprobar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
