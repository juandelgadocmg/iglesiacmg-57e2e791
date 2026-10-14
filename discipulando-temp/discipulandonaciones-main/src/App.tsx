import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicDashboard from "./pages/PublicDashboard";
import LeaderDetailPage from "./pages/LeaderDetailPage";
import UpdateLeaderPage from "./pages/UpdateLeaderPage";
import SetupPage from "./pages/SetupPage";
import ExportLideresPage from "./pages/ExportLideresPage";
import LideresPage from "./pages/LideresPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/lider/:id" element={<LeaderDetailPage />} />
          <Route path="/actualizar-lider/:token" element={<UpdateLeaderPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/lideres" element={<LideresPage />} />
          <Route path="/export-lideres" element={<ExportLideresPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
