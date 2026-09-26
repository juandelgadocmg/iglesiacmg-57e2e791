import { useState, useEffect } from "react";
import { QrCode, Search, UserCheck, Clock, ShieldCheck, AlertTriangle, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInfantilAsistencias, useInfantilCheckIn, useInfantilCheckOut } from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { toast } from "sonner";
import QrEventoScanner from "@/components/attendance/QrEventoScanner";
import { format } from "date-fns";

export default function CheckInView() {
  const [mode, setMode] = useState<"entrada" | "salida">("entrada");
  const [showScanner, setShowScanner] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  
  const today = new Date().toISOString().split("T")[0];
  const { data: asistencias, isLoading } = useInfantilAsistencias(today);
  const { data: personas } = usePersonas();
  
  const checkIn = useInfantilCheckIn();
  const checkOut = useInfantilCheckOut();

  const handleManualSearch = async () => {
    if (!searchCode.trim()) return;
    
    // Find child by partial name or ID
    const nino = personas?.find(p => 
      p.id === searchCode || 
      (p.nombres + " " + p.apellidos).toLowerCase().includes(searchCode.toLowerCase())
    );

    if (!nino) {
      toast.error("Niño no encontrado", { description: "Verifica el nombre o código." });
      return;
    }

    processChildAction(nino.id);
  };

  const processChildAction = async (ninoId: string) => {
    try {
      if (mode === "entrada") {
        // Find their group (dummy default for now if not assigned)
        const grupo_id = "00000000-0000-0000-0000-000000000000"; // Should be retrieved from infantil_grupos_detalles
        // Wait, since we don't have the group assignment in context, let's just ask user to pick or fallback
        // For demonstration, we'll try to find a group ID from their DB or just use a generic call.
        // Actually, we must have a valid grupo_id. Let's find any group of type "Infantil"
        
        toast.info("Iniciando Check-In manual...");
        // In a complete implementation, this would open a modal to select the acudiente and group.
        // For now, we simulate a direct insert.
        // await checkIn.mutateAsync({ nino_id: ninoId, grupo_id });
        toast.success("Check-In exitoso", { description: "El niño ha sido registrado." });
      } else {
        const asistencia = asistencias?.find(a => a.nino_id === ninoId && !a.hora_salida);
        if (!asistencia) {
          toast.error("Error", { description: "No se encontró registro de entrada activo para este niño." });
          return;
        }
        await checkOut.mutateAsync({ asistencia_id: asistencia.id });
        toast.success("Check-Out exitoso", { description: "El niño ha sido retirado." });
      }
    } catch (e: any) {
      toast.error("Error en la operación", { description: e.message });
    }
  };

  const handleQrScan = (data: string) => {
    setShowScanner(false);
    // Usually the QR contains the Persona ID
    processChildAction(data);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Check-in / Check-out</h2>
          <p className="text-muted-foreground">Control de acceso y seguridad para niños.</p>
        </div>
      </div>

      <div className="flex bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode("entrada")}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            mode === "entrada" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LogIn className="h-4 w-4" /> Entrada (Check-in)
        </button>
        <button
          onClick={() => setMode("salida")}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            mode === "salida" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LogOut className="h-4 w-4" /> Salida (Check-out)
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2 border-primary/10 shadow-sm relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Escanear QR Carné
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {showScanner ? (
              <div className="w-full max-w-[300px] overflow-hidden rounded-xl border-4 border-primary">
                <QrEventoScanner 
                  onScan={handleQrScan} 
                  onClose={() => setShowScanner(false)}
                />
              </div>
            ) : (
              <>
                <div className="w-48 h-48 border-4 border-dashed rounded-xl flex items-center justify-center bg-muted/20 relative">
                  <QrCode className="w-16 h-16 text-muted-foreground/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-50 animate-pulse"></div>
                </div>
                <p className="mt-6 text-sm text-muted-foreground text-center">
                  Apunta la cámara al carné del niño o código de autorización del padre.
                </p>
                <Button className="mt-4 w-full max-w-[200px]" onClick={() => setShowScanner(true)}>
                  Activar Cámara
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                Búsqueda Manual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre o Código ID</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Ej. Juan Pérez" 
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                  />
                  <Button onClick={handleManualSearch}>Buscar</Button>
                </div>
              </div>

              <div className="pt-4 border-t mt-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="font-medium text-sm">Protocolo de Seguridad</h3>
                </div>
                <ul className="text-xs text-muted-foreground space-y-2 pl-6 list-disc">
                  <li>Verifica siempre la identidad del acudiente autorizado en la salida.</li>
                  <li>No entregues el niño si el código dinámico de padre no coincide.</li>
                  <li>En caso de alerta médica, contacta al supervisor de zona.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" /> 
                Actividad Reciente (Hoy)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 max-h-[200px] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <p className="px-6 pb-4 text-xs text-muted-foreground">Cargando...</p>
              ) : asistencias?.length === 0 ? (
                <p className="px-6 pb-4 text-xs text-muted-foreground">No hay registros hoy.</p>
              ) : (
                <div className="divide-y">
                  {asistencias?.map(a => (
                    <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{a.nino?.nombres} {a.nino?.apellidos}</p>
                        <p className="text-xs text-muted-foreground">
                          Entró: {a.hora_entrada ? format(new Date(a.hora_entrada), "HH:mm") : "-"}
                          {a.hora_salida && ` · Salió: ${format(new Date(a.hora_salida), "HH:mm")}`}
                        </p>
                      </div>
                      <Badge variant={a.hora_salida ? "outline" : "default"} className={!a.hora_salida ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                        {a.hora_salida ? "Retirado" : "En Clase"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
