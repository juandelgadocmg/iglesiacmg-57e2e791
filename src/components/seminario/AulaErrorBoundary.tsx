import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props { children: React.ReactNode; label?: string; onRetry?: () => void | Promise<void>; }
interface State { hasError: boolean; error?: Error; retrying: boolean; }

export default class AulaErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retrying: false };
  static getDerivedStateFromError(error: Error): Partial<State> { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("[AulaErrorBoundary]", this.props.label || "", error, info);
  }
  retry = async () => {
    this.setState({ retrying: true });
    try {
      // 1) refresca sesión para revalidar RLS
      try { await supabase.auth.refreshSession(); } catch { /* ignore */ }
      // 2) re-fetch global de queries del aula (cursos/anuncios/recursos/foros)
      try {
        const w = window as any;
        const qc = w.__lovableQueryClient || w.queryClient;
        if (qc?.invalidateQueries) await qc.invalidateQueries();
      } catch { /* ignore */ }
      // 3) callback opcional del padre
      if (this.props.onRetry) await this.props.onRetry();
    } finally {
      this.setState({ hasError: false, error: undefined, retrying: false });
    }
  };
  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="p-6 text-center space-y-3" data-testid="aula-error-boundary">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <p className="font-medium">No se pudo renderizar {this.props.label || "esta sección"}</p>
            <p className="text-xs text-muted-foreground break-all">{this.state.error?.message || "Error desconocido"}</p>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="default" onClick={this.retry} disabled={this.state.retrying} data-testid="aula-error-retry">
                <RefreshCcw className={`h-3.5 w-3.5 mr-1 ${this.state.retrying ? "animate-spin" : ""}`} />
                {this.state.retrying ? "Reintentando..." : "Reintentar (revalidar sesión y datos)"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Recargar página
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
