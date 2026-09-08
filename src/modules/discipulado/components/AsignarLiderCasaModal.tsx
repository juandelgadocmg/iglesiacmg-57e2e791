import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AsignarLiderCasaModalProps {
  isOpen: boolean;
  onClose: () => void;
  casaId: string;
  casaName: string;
  lideresDisponibles: any[];
  currentLiderId?: string | null;
  onSuccess: () => void;
}

export function AsignarLiderCasaModal({
  isOpen,
  onClose,
  casaId,
  casaName,
  lideresDisponibles,
  currentLiderId,
  onSuccess
}: AsignarLiderCasaModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredLideres = useMemo(() => {
    return lideresDisponibles
      .filter((l) => l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [lideresDisponibles, searchTerm]);

  const handleAssign = async (liderId: string) => {
    if (!casaId || casaId === 'no-casa') return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('leaders')
        .update({ casa_de_paz_id: casaId })
        .eq('id', liderId);

      if (error) throw error;
      
      toast.success("Líder asignado exitosamente");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al asignar el líder: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (liderId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('leaders')
        .update({ casa_de_paz_id: null })
        .eq('id', liderId);

      if (error) throw error;
      
      toast.success("Líder removido de la Casa de Paz");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al remover el líder: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Líder</DialogTitle>
          <DialogDescription>
            Selecciona un líder para la Casa de Paz <strong>{casaName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o correo..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {filteredLideres.map((lider) => {
                const isCurrent = lider.casa_de_paz_id === casaId;
                
                return (
                  <div key={lider.id} className={`flex items-center justify-between p-3 rounded-lg border ${isCurrent ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}>
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-2">
                        {lider.full_name}
                        {isCurrent && <Badge variant="default" className="text-[10px] bg-blue-600">Actual</Badge>}
                      </p>
                      <p className="text-xs text-slate-500">{lider.email || 'Sin correo'}</p>
                      {!isCurrent && lider.casa_de_paz_id && (
                        <p className="text-[10px] text-amber-600 mt-1">Ya lidera otra casa</p>
                      )}
                    </div>
                    
                    {isCurrent ? (
                       <Button 
                         size="sm" 
                         variant="outline"
                         className="text-red-600 border-red-200 hover:bg-red-50"
                         disabled={isSubmitting}
                         onClick={() => handleRemove(lider.id)}
                       >
                         Remover
                       </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        disabled={isSubmitting}
                        onClick={() => handleAssign(lider.id)}
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Asignar
                      </Button>
                    )}
                  </div>
                );
              })}
              
              {filteredLideres.length === 0 && (
                <div className="text-center p-8 text-slate-500 text-sm">
                  No se encontraron líderes que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
