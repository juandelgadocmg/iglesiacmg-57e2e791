import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  LayoutDashboard, Users, UserRound, ClipboardList, LogIn, QrCode, IdCard,
  UsersRound, GraduationCap, BookOpen, CalendarDays, Heart, Bell, BarChart3,
  FileText, PartyPopper, Settings
} from "lucide-react";

import DashboardInfantil from "@/modules/infantil/components/DashboardInfantil";
import NinosList from "@/modules/infantil/components/NinosList";
import CheckInView from "@/modules/infantil/components/CheckInView";
import CentroAtencionView from "@/modules/infantil/components/CentroAtencionView";
import PanelMaestroView from "@/modules/infantil/components/PanelMaestroView";
import ClasesProgramacionView from "@/modules/infantil/components/ClasesProgramacionView";
import PadresView from "@/modules/infantil/components/PadresView";
import GruposInfantilesView from "@/modules/infantil/components/GruposInfantilesView";
import MaestrosInfantilesView from "@/modules/infantil/components/MaestrosInfantilesView";
import CarnesView from "@/modules/infantil/components/CarnesView";
import AsistenciaInfantilView from "@/modules/infantil/components/AsistenciaInfantilView";
import QRSystemView from "@/modules/infantil/components/QRSystemView";
import SeguimientoInfantilView from "@/modules/infantil/components/SeguimientoInfantilView";
import NotificacionesInfantilView from "@/modules/infantil/components/NotificacionesInfantilView";
import EstadisticasInfantilView from "@/modules/infantil/components/EstadisticasInfantilView";
import ReportesInfantilView from "@/modules/infantil/components/ReportesInfantilView";
import { AlertCircle, Contact } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "" },
  { id: "centro-atencion", label: "Centro de Atención", icon: AlertCircle, path: "centro-atencion" },
  { id: "panel-maestro", label: "Mi Panel (Maestro)", icon: Contact, path: "panel-maestro" },
  { id: "ninos", label: "Niños", icon: Users, path: "ninos" },
  { id: "padres", label: "Padres y acudientes", icon: UserRound, path: "padres" },
  { id: "asistencia", label: "Asistencia", icon: ClipboardList, path: "asistencia" },
  { id: "checkin", label: "Check-in / Check-out", icon: LogIn, path: "checkin" },
  { id: "qr", label: "QR", icon: QrCode, path: "qr" },
  { id: "carnes", label: "Carnés", icon: IdCard, path: "carnes" },
  { id: "grupos", label: "Grupos", icon: UsersRound, path: "grupos" },
  { id: "maestros", label: "Gestión Maestros", icon: GraduationCap, path: "maestros" },
  { id: "clases", label: "Clases", icon: BookOpen, path: "clases" },
  { id: "programacion", label: "Programación", icon: CalendarDays, path: "programacion" },
  { id: "seguimiento", label: "Seguimiento", icon: Heart, path: "seguimiento" },
  { id: "notificaciones", label: "Notificaciones", icon: Bell, path: "notificaciones" },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3, path: "estadisticas" },
  { id: "reportes", label: "Reportes", icon: FileText, path: "reportes" },
  { id: "eventos", label: "Eventos", icon: PartyPopper, path: "eventos" },
  { id: "configuracion", label: "Configuración", icon: Settings, path: "configuracion" },
];

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center border-2 border-dashed rounded-xl p-8 bg-muted/20">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md">
        Esta sección se encuentra en desarrollo. La arquitectura base ya está preparada para activar estas funciones próximamente.
      </p>
    </div>
  );
}

export default function InfantilPage() {
  const { session } = useAuth();
  const { activeRole } = useActiveRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Get current active tab from path
  const currentPath = location.pathname.split("/infantil")[1]?.replace(/^\//, "") || "";
  const activeTabId = TABS.find(t => t.path === currentPath)?.id || "dashboard";

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] w-full md:flex-row gap-4 p-2 md:p-4">
      {/* Sidebar Navigation for Module */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-1 overflow-y-auto pr-2 pb-10 custom-scrollbar border-r md:border-r-0 md:pr-4">
        <div className="mb-4 px-2">
          <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">DOXA Infantil</h1>
          <p className="text-xs text-muted-foreground mt-1">Ministerio de Niños</p>
        </div>
        
        {TABS.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(`/infantil/${tab.path}`)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                isActive 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-y-auto custom-scrollbar">
        <Routes>
          <Route path="/" element={<DashboardInfantil />} />
          <Route path="/centro-atencion" element={<CentroAtencionView />} />
          <Route path="/panel-maestro" element={<PanelMaestroView />} />
          <Route path="/ninos" element={<NinosList />} />
          <Route path="/checkin" element={<CheckInView />} />
          
          {/* Placeholders for pending features */}
          <Route path="/padres" element={<PadresView />} />
          <Route path="/asistencia" element={<AsistenciaInfantilView />} />
          <Route path="/qr" element={<QRSystemView />} />
          <Route path="/carnes" element={<CarnesView />} />
          <Route path="/grupos" element={<GruposInfantilesView />} />
          <Route path="/maestros" element={<MaestrosInfantilesView />} />
          <Route path="/clases" element={<ClasesProgramacionView />} />
          <Route path="/programacion" element={<ClasesProgramacionView />} />
          <Route path="/seguimiento" element={<SeguimientoInfantilView />} />
          <Route path="/notificaciones" element={<NotificacionesInfantilView />} />
          <Route path="/estadisticas" element={<EstadisticasInfantilView />} />
          <Route path="/reportes" element={<ReportesInfantilView />} />
          <Route path="/eventos" element={<PlaceholderView title="Eventos Especiales" />} />
          <Route path="/configuracion" element={<PlaceholderView title="Configuración" />} />
          
          <Route path="*" element={<Navigate to="/infantil" replace />} />
        </Routes>
      </div>
    </div>
  );
}
