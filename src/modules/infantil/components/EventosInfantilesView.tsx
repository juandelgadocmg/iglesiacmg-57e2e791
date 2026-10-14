import { useState } from "react";
import { PartyPopper, CalendarPlus, MapPin, Users, Ticket, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EventosInfantilesView() {
  const eventos = [
    {
      id: 1,
      titulo: "Escuela Bíblica de Vacaciones (EBDV)",
      fecha: "15 de Octubre, 2026",
      lugar: "Auditorio Principal y Salones",
      inscritos: 124,
      capacidad: 200,
      estado: "Próximo",
      color: "bg-blue-500",
      bgLight: "bg-blue-50",
      text: "text-blue-600"
    },
    {
      id: 2,
      titulo: "Campamento Kids 2026",
      fecha: "20 de Noviembre, 2026",
      lugar: "Finca Los Pinos",
      inscritos: 85,
      capacidad: 100,
      estado: "Inscripciones Abiertas",
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50",
      text: "text-emerald-600"
    }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Eventos Especiales
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Campamentos, EBDV y actividades especiales para los niños.</p>
        </div>
        <Button className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6">
          <CalendarPlus className="h-5 w-5 mr-2" /> Crear Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eventos.map((ev) => (
          <Card key={ev.id} className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform duration-300">
            <div className={`h-3 w-full ${ev.color}`} />
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${ev.bgLight} ${ev.text}`}>
                  <PartyPopper className="w-6 h-6" />
                </div>
                <Badge className={`${ev.bgLight} ${ev.text} border-0 shadow-none font-bold`}>
                  {ev.estado}
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-navy mb-2">{ev.titulo}</h3>
              
              <div className="space-y-3 mt-4 mb-6">
                <div className="flex items-center text-slate-600 text-sm font-medium">
                  <CalendarPlus className="w-4 h-4 mr-3 text-slate-400" />
                  {ev.fecha}
                </div>
                <div className="flex items-center text-slate-600 text-sm font-medium">
                  <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                  {ev.lugar}
                </div>
                <div className="flex items-center text-slate-600 text-sm font-medium">
                  <Users className="w-4 h-4 mr-3 text-slate-400" />
                  {ev.inscritos} de {ev.capacidad} niños inscritos
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${ev.color}`} 
                  style={{ width: `${(ev.inscritos / ev.capacidad) * 100}%` }}
                />
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-none">
                  Ver Detalles
                </Button>
                <Button className="flex-1 rounded-xl bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20">
                  <Ticket className="w-4 h-4 mr-2" /> Entradas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
