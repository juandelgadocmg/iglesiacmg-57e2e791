import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Sparkles } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[GlobalErrorBoundary] Uncaught UI error:", error, errorInfo);
  }

  handleClearCacheAndReload = () => {
    try {
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
          <div className="text-center max-w-md bg-card p-8 rounded-3xl border border-border shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/5">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight">Ocurrió un error inesperado</h1>
              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                {this.state.error?.message || "La aplicación encontró un problema de inicio."}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                onClick={this.handleClearCacheAndReload}
                className="gap-2 font-bold w-full bg-primary text-primary-foreground py-5 rounded-xl shadow-md"
              >
                <RefreshCw className="h-4 w-4" /> Limpiar Caché y Recargar Inicio
              </Button>

              <Button
                variant="outline"
                onClick={() => (window.location.href = "/afirmacion")}
                className="gap-2 font-semibold w-full rounded-xl py-5"
              >
                <Sparkles className="h-4 w-4 text-emerald-600" /> Ir a Afirmación del Creyente
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
