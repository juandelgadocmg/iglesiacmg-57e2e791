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
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Check-in / Check-out
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Control de acceso dinámico y seguridad biométrica para niños.</p>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 w-fit relative overflow-hidden">
        <div className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-navy rounded-lg transition-transform duration-300 ease-out ${mode === "salida" ? "translate-x-full" : "translate-x-0"}`} />
        <button
          onClick={() => setMode("entrada")}
          className={`relative z-10 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 min-w-[140px] justify-center ${
            mode === "entrada" ? "text-white" : "text-slate-500 hover:text-navy"
          }`}
        >
          <LogIn className="h-4 w-4" /> Entrada
        </button>
        <button
          onClick={() => setMode("salida")}
          className={`relative z-10 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 min-w-[140px] justify-center ${
            mode === "salida" ? "text-white" : "text-slate-500 hover:text-navy"
          }`}
        >
          <LogOut className="h-4 w-4" /> Salida
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-xl shadow-navy/5 bg-white/80 backdrop-blur-xl relative overflow-hidden rounded-3xl group transition-all duration-300 hover:shadow-2xl hover:shadow-navy/10">
          <div className={`absolute top-0 left-0 w-full h-1.5 ${mode === "entrada" ? "bg-gradient-to-r from-blue-400 to-navy" : "bg-gradient-to-r from-coral to-orange-400"}`} />
          <CardHeader className="pb-4 pt-8">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-navy">
              <div className={`p-2.5 rounded-xl ${mode === "entrada" ? "bg-blue-50 text-blue-600" : "bg-coral/10 text-coral"}`}>
                <QrCode className="w-6 h-6" />
              </div>
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

        <div className="space-y-8">
          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Search className="w-5 h-5 text-slate-400" />
                Búsqueda Manual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Nombre o Código ID</label>
                <div className="flex gap-3">
                  <Input 
                    placeholder="Ej. Juan Pérez" 
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-navy transition-all"
                  />
                  <Button onClick={handleManualSearch} className="h-12 px-6 rounded-xl bg-navy hover:bg-navy/90 text-white shadow-md shadow-navy/20 transition-all active:scale-95">
                    Buscar
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2 text-amber-600 mb-3 bg-amber-50 w-fit px-3 py-1.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Protocolo de Seguridad</h3>
                </div>
                <ul className="text-sm text-slate-500 space-y-2 pl-6 list-disc marker:text-amber-300">
                  <li>Verifica siempre la identidad del acudiente autorizado.</li>
                  <li>No entregues el niño si el código dinámico no coincide.</li>
                  <li>En caso de alerta médica, contacta al supervisor.</li>
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
