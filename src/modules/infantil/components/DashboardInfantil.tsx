import { useMemo } from "react";
import { Users, UserPlus, Clock, AlertCircle, Shirt, QrCode, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNinos } from "../hooks/useNinos";
import { useInfantilAsistencias, useInfantilAtenciones } from "@/hooks/useInfantil";
import { useNavigate } from "react-router-dom";

export default function DashboardInfantil() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { ninos, isLoading: isLoadingNinos } = useNinos();
  const { data: asistencias } = useInfantilAsistencias(today);
  const { data: atenciones } = useInfantilAtenciones();

  const totalNinos = (ninos || []).length;
  const asistenciaHoy = (asistencias || []).length;
  const enClaseAhora = (asistencias || []).filter(a => !a.hora_salida).length;
  const pendientesAtencion = (atenciones || []).filter((a: any) => a.estado === "Pendiente").length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Infantil</h2>
          <p className="text-muted-foreground text-sm">Resumen general y métricas en tiempo real del ministerio de niños</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => navigate("/infantil/carnes")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Shirt className="w-3.5 h-3.5" />
            Imprimir Stickers Camiseta
          </Button>
          <Button 
            onClick={() => navigate("/infantil/checkin")}
            variant="outline"
            className="rounded-xl text-xs font-bold gap-1.5 border-slate-300"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            Check-In QR
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Niños Registrados</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-navy">{isLoadingNinos ? "..." : totalNinos}</div>
            <p className="text-xs text-muted-foreground mt-1">Directorio activo de menores</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Asistencia Hoy</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{asistenciaHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">{enClaseAhora} niños actualmente en clase</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Retirados Hoy</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-navy">{asistenciaHoy - enClaseAhora}</div>
            <p className="text-xs text-muted-foreground mt-1">Con check-out completado</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-200 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Atención Requerida</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-700">{pendientesAtencion}</div>
            <p className="text-xs text-red-600 mt-1">Solicitudes pendientes de maestros</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-navy">Accesos Rápidos de Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => navigate("/infantil/carnes")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Shirt className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Imprimir Stickers Adhesivos para Camisetas</p>
                  <p className="text-xs text-slate-500">Etiquetas con QR, nombre grande, grupo y alergias</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate("/infantil/checkin")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Check-In / Check-Out de Menores</p>
                  <p className="text-xs text-slate-500">Registro de entrada, escaneo con cámara y control de salida</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate("/infantil/centro-atencion")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Centro de Atención en Vivo</p>
                  <p className="text-xs text-slate-500">Monitoreo de solicitudes médicas, baño o llamada a padres</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Últimas Entradas Registradas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(asistencias || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No hay registros de asistencia para la reunión de hoy.</p>
            ) : (
              <div className="space-y-2">
                {(asistencias || []).slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">{a.nino?.nombres} {a.nino?.apellidos}</span>
                    <Badge variant={a.hora_salida ? "outline" : "default"} className={!a.hora_salida ? "bg-emerald-500 text-white" : ""}>
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
  );
}
