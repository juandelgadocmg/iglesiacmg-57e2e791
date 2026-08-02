import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ActiveRoleProvider } from "@/hooks/useActiveRole";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleGuard from "@/components/auth/RoleGuard";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import PersonasPage from "@/pages/PersonasPage";
import PersonaPerfilPage from "@/pages/PersonaPerfilPage";
import GruposPage from "@/pages/GruposPage";
import ServiciosPage from "@/pages/ServiciosPage";
import FinanzasPage from "@/pages/FinanzasPage";
import EventosPage from "@/pages/EventosPage";
import AcademiaPage from "@/pages/AcademiaPage";
import SeminarioPage from "@/pages/SeminarioPage";
import CertificadosPage from "@/pages/CertificadosPage";
import ReportesPage from "@/pages/ReportesPage";
import PeticionesPage from "@/pages/PeticionesPage";
import UsuariosPage from "@/pages/UsuariosPage";
import MensajesPage from "@/pages/MensajesPage";
import ConfiguracionPage from "@/pages/ConfiguracionPage";
import ChatPage from "@/pages/ChatPage";
import ChatSharePage from "@/pages/ChatSharePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import CheckInPage from "@/pages/CheckInPage";
import VerificarAcademicoPage from "@/pages/VerificarAcademicoPage";
import OAuthConsentPage from "@/pages/OAuthConsentPage";
import SeguridadPage from "@/pages/SeguridadPage";
import NotFound from "./pages/NotFound";
import DesignSystemPage from "@/pages/_design-system/DesignSystemPage";
import HoyPage from "@/pages/HoyPage";
import CumpleanosPage from "@/pages/CumpleanosPage";
import AlertasPage from "@/pages/AlertasPage";
import ActividadPage from "@/pages/ActividadPage";
import PWAUpdatePrompt from "@/components/pwa/PWAUpdatePrompt";
import { installOfflineQueueAutoFlush } from "@/lib/qrOfflineQueue";

const queryClient = new QueryClient();
if (typeof window !== "undefined") {
  (window as any).__lovableQueryClient = queryClient;
  installOfflineQueueAutoFlush();
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />

        <BrowserRouter>
          <AuthProvider>
            <ActiveRoleProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/check-in/:servicioId" element={<CheckInPage />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
                <Route path="/chat/compartida/:token" element={<ChatSharePage />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/hoy" element={<HoyPage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/personas" element={<RoleGuard><PersonasPage /></RoleGuard>} />
                  <Route path="/personas/:id" element={<RoleGuard><PersonaPerfilPage /></RoleGuard>} />
                  <Route path="/grupos" element={<RoleGuard><GruposPage /></RoleGuard>} />
                  <Route path="/servicios" element={<RoleGuard><ServiciosPage /></RoleGuard>} />
                  <Route path="/finanzas" element={<RoleGuard><FinanzasPage /></RoleGuard>} />
                  <Route path="/eventos" element={<RoleGuard><EventosPage /></RoleGuard>} />
                  <Route path="/academia" element={<RoleGuard><AcademiaPage /></RoleGuard>} />
                  <Route path="/seminario" element={<RoleGuard><SeminarioPage /></RoleGuard>} />
                  <Route path="/certificados" element={<RoleGuard><CertificadosPage /></RoleGuard>} />
                  <Route path="/reportes" element={<RoleGuard><ReportesPage /></RoleGuard>} />
                  <Route path="/peticiones" element={<RoleGuard><PeticionesPage /></RoleGuard>} />
                  <Route path="/usuarios" element={<RoleGuard><UsuariosPage /></RoleGuard>} />
                  <Route path="/mensajes" element={<MensajesPage />} />
                  <Route path="/configuracion" element={<RoleGuard><ConfiguracionPage /></RoleGuard>} />
                  <Route path="/seguridad" element={<RoleGuard><SeguridadPage /></RoleGuard>} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/cumpleanos" element={<CumpleanosPage />} />
                  <Route path="/alertas" element={<AlertasPage />} />
                  <Route path="/actividad" element={<ActividadPage />} />
                  <Route path="/verificar-academico/:id" element={<VerificarAcademicoPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ActiveRoleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
