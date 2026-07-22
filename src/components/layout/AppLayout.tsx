import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebarNew from "./shell/AppSidebarNew";
import AppTopBar from "./shell/AppTopBar";
import { ContextDockProvider } from "./context-dock/ContextDock";
import { useMessageNotifications } from "@/hooks/useMensajes";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useMessageNotifications();

  return (
    <ContextDockProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
        <AppSidebarNew mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 max-w-full">
          <AppTopBar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 p-3 md:p-6 overflow-x-hidden overflow-y-auto min-w-0 max-w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </ContextDockProvider>

  );
}
