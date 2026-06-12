import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface State { hasError: boolean; error?: Error; }

export default class AulaErrorBoundary extends React.Component<{ children: React.ReactNode; label?: string }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("[AulaErrorBoundary]", this.props.label || "", error, info);
  }
  reset = () => this.setState({ hasError: false, error: undefined });
  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="p-6 text-center space-y-3" data-testid="aula-error-boundary">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <p className="font-medium">No se pudo renderizar {this.props.label || "esta sección"}</p>
            <p className="text-xs text-muted-foreground break-all">{this.state.error?.message || "Error desconocido"}</p>
            <Button size="sm" variant="outline" onClick={this.reset}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1" />Reintentar
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
