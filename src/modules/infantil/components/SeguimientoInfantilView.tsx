import { useState } from "react";
import { Heart, Search, CalendarPlus, PhoneCall, CheckCircle2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersonas } from "@/hooks/useDatabase";

export default function SeguimientoInfantilView() {
  const { data: personas, isLoading } = usePersonas();
  const [searchTerm, setSearchTerm] = useState("");

  const fakeSeguimientos = [
    { id: 1, nino: "Lucas Mendez", fecha: "2026-09-25", tipo: "Ausencia", estado: "Pendiente", notas: "Faltó 3 semanas seguidas." },
    { id: 2, nino: "Sofia Ramirez", fecha: "2026-09-24", tipo: "Bienvenida", estado: "Completado", notas: "Se le entregó el kit de nuevo ingreso." },
    { id: 3, nino: "Mateo Ortiz", fecha: "2026-09-20", tipo: "Cumpleaños", estado: "Pendiente", notas: "Llamar para felicitar de parte del equipo." },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Seguimiento Pastoral
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Gestión de llamadas, visitas y seguimiento personalizado a los niños.</p>
        </div>
        <Button className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6">
          <CalendarPlus className="h-5 w-5 mr-2" /> Programar Seguimiento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-lg font-bold text-navy flex items-center gap-2">
                <Heart className="w-5 h-5 text-coral" /> Tareas Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {fakeSeguimientos.map(seg => (
                  <div key={seg.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800">{seg.nino}</span>
                      {seg.estado === 'Pendiente' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-0 shadow-none">Pendiente</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 shadow-none">Completado</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <Badge variant="outline" className="text-[10px] bg-white border-slate-200">{seg.tipo}</Badge>
                      <span>Vence: {seg.fecha}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{seg.notas}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl bg-white h-full min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Buscar ficha de seguimiento por niño..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <User className="h-16 w-16 mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-600 mb-2">Selecciona un niño</h3>
              <p className="max-w-sm text-sm">
                Busca a un niño en la barra superior para ver su historial completo de seguimiento pastoral, notas médicas y llamadas realizadas a sus acudientes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
