import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebarNew from "./shell/AppSidebarNew";
import AppTopBar from "./shell/AppTopBar";
import { ContextDockProvider } from "./context-dock/ContextDock";
import { useMessageNotifications } from "@/hooks/useMensajes";
import LiveAnnouncer from "@/components/shared/LiveAnnouncer";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useMessageNotifications();

  return (
    <ContextDockProvider>
      <div className="flex h-screen w-screen max-w-full overflow-hidden bg-background">
        <AppSidebarNew mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col h-full min-w-0 max-w-full overflow-hidden">
          <AppTopBar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 min-h-0 p-2 md:p-3 overflow-x-hidden overflow-y-auto min-w-0 max-w-full">
            <Outlet />
          </main>
        </div>
      </div>
      <LiveAnnouncer />
    </ContextDockProvider>
  );
}

