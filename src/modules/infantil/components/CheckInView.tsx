import { useState } from "react";
import { QrCode, UserCheck, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckInView() {
  const [mode, setMode] = useState<"entrada" | "salida">("entrada");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Check-in / Check-out</h2>
          <p className="text-muted-foreground">Control de acceso y seguridad para niños.</p>
        </div>
      </div>

      <div className="flex bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode("entrada")}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "entrada" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Entrada (Check-in)
        </button>
        <button
          onClick={() => setMode("salida")}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "salida" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Salida (Check-out)
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2 border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Escanear QR
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-48 h-48 border-4 border-dashed rounded-xl flex items-center justify-center bg-muted/20 relative">
              <QrCode className="w-16 h-16 text-muted-foreground/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-50 animate-pulse"></div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground text-center">
              Apunta la cámara al código QR del niño o del padre.
            </p>
            <Button className="mt-4 w-full max-w-[200px]" variant="secondary">
              Activar Cámara
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="w-5 h-5 text-muted-foreground" />
              Búsqueda Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre o Código</label>
              <Input placeholder="Ej. Juan Pérez o Código ID" />
            </div>
            <Button className="w-full">Buscar Niño</Button>

            <div className="pt-6 border-t mt-6">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="font-medium text-sm">Protocolo de Seguridad</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-2 pl-6 list-disc">
                <li>Verifica siempre la identidad del acudiente.</li>
                <li>Solo entrega al niño a personas autorizadas en el sistema.</li>
                <li>Si hay dudas, contacta al coordinador inmediatamente.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
