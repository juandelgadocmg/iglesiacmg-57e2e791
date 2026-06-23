import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Calendar, Users, Briefcase, BarChart3 } from "lucide-react";
import DashboardProgPanel from "./DashboardProgPanel";
import CalendarioPanel from "./CalendarioPanel";
import MinisteriosPanel from "./MinisteriosPanel";
import ServidoresPanel from "./ServidoresPanel";
import ReportesProgPanel from "./ReportesProgPanel";
import EventoDetailPanel from "./EventoDetailPanel";
import { useProgEventos, useDeleteEvento } from "@/hooks/usePrograma";

export default function ProgramacionTab() {
  const [tab, setTab] = useState("dashboard");
  const [openEventoId, setOpenEventoId] = useState<string | null>(null);
  const { data: eventos = [] } = useProgEventos();
  const delEv = useDeleteEvento();

  if (openEventoId) {
    const ev = eventos.find((e) => e.id === openEventoId);
    if (ev) return <EventoDetailPanel evento={ev} onBack={() => setOpenEventoId(null)} onDelete={() => { delEv.mutate(ev.id); setOpenEventoId(null); }} />;
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
        <TabsTrigger value="dashboard"><LayoutDashboard className="h-4 w-4 md:mr-1.5" /><span className="hidden md:inline">Dashboard</span></TabsTrigger>
        <TabsTrigger value="calendario"><Calendar className="h-4 w-4 md:mr-1.5" /><span className="hidden md:inline">Calendario</span></TabsTrigger>
        <TabsTrigger value="ministerios"><Briefcase className="h-4 w-4 md:mr-1.5" /><span className="hidden md:inline">Ministerios</span></TabsTrigger>
        <TabsTrigger value="servidores"><Users className="h-4 w-4 md:mr-1.5" /><span className="hidden md:inline">Servidores</span></TabsTrigger>
        <TabsTrigger value="reportes"><BarChart3 className="h-4 w-4 md:mr-1.5" /><span className="hidden md:inline">Reportes</span></TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard"><DashboardProgPanel onOpenEvento={setOpenEventoId} /></TabsContent>
      <TabsContent value="calendario"><CalendarioPanel /></TabsContent>
      <TabsContent value="ministerios"><MinisteriosPanel /></TabsContent>
      <TabsContent value="servidores"><ServidoresPanel /></TabsContent>
      <TabsContent value="reportes"><ReportesProgPanel /></TabsContent>
    </Tabs>
  );
}
