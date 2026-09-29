import { useState, useMemo, useEffect } from "react";
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const search = async () => {
      let query = supabase
        .from('profiles')
        .select('user_id, display_name');

      if (searchTerm.trim().length >= 2) {
        query = query.ilike('display_name', `%${searchTerm}%`).limit(20);
      } else {
        // Si no ha escrito nada, cargar una lista grande por defecto
        query = query.limit(50);
      }
      
      const { data, error } = await query;
      if (error) console.error("Error fetching profiles:", error);
        
      if (data) {
        const mapped = data.map(p => ({
          id: p.user_id,
          full_name: p.display_name?.trim() || 'Usuario sin nombre',
          email: '', // El email está en auth.users, por ahora lo dejamos vacío o usamos display_name si parece un email
          phone: '',
          casa_de_paz_id: null,
          is_from_personas: true
        }));
        setSearchResults(mapped);
      }
    };
    
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const combinedLideres = useMemo(() => {
    // 1. Filtrar líderes existentes en el módulo
    const existing = lideresDisponibles.filter((l) => 
      l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 2. Agregar resultados de personas (evitando duplicados por nombre)
    const existingNames = new Set(existing.map(e => e.full_name?.toLowerCase()));
    const newFromPersonas = searchResults.filter(r => !existingNames.has(r.full_name?.toLowerCase()));
    
    return [...existing, ...newFromPersonas].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [lideresDisponibles, searchTerm, searchResults]);

  const handleAssign = async (lider: any) => {
    if (!casaId || casaId === 'no-casa') return;
    
    setIsSubmitting(true);
    try {
      if (lider.is_from_personas) {
        // Upsert a la tabla leaders usando el ID de la persona
        const { error: upsertError } = await supabase
          .from('leaders')
          .upsert({
            id: lider.id,
            full_name: lider.full_name,
            email: lider.email,
            phone: lider.phone,
            casa_de_paz_id: casaId
          }, { onConflict: 'id' });
          
        if (upsertError) throw upsertError;
      } else {
        // Actualizar el líder existente SOLO si no tiene una casa_de_paz_id asignada
        // Esto permite que el líder pueda pertenecer a múltiples casas (una en 'leaders' y otras en 'grupos')
        if (!lider.casa_de_paz_id) {
          const { error } = await supabase
            .from('leaders')
            .update({ casa_de_paz_id: casaId })
            .eq('id', lider.id);
            
          if (error) throw error;
        }
      }
      
      // Actualizar también la tabla grupos (Casa de Paz) para mantener la sincronización
      const { error: errorGrupos } = await supabase
        .from('grupos')
        .update({ lider_id: lider.id })
        .eq('id', casaId);
        
      if (errorGrupos) {
        console.error("Error updating grupos:", errorGrupos);
        throw errorGrupos;
      }
      
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
      const liderToRemove = combinedLideres.find(l => l.id === liderId);
      
      // Solo limpiamos la casa_de_paz_id en la tabla leaders si es la misma casa de la que lo estamos removiendo
      if (liderToRemove && liderToRemove.casa_de_paz_id === casaId) {
        const { error } = await supabase
          .from('leaders')
          .update({ casa_de_paz_id: null })
          .eq('id', liderId);

        if (error) throw error;
      }
      
      // Remover de grupos también
      await supabase
        .from('grupos')
        .update({ lider_id: null })
        .eq('id', casaId);
      
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
            Busca y selecciona un líder de la base de datos para la Casa de Paz <strong>{casaName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Busca cualquier persona por nombre..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {combinedLideres.map((lider) => {
                const isCurrent = lider.casa_de_paz_id === casaId;
                
                return (
                  <div key={lider.id} className={`flex items-center justify-between p-3 rounded-lg border ${isCurrent ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}>
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-2">
                        {lider.full_name}
                        {isCurrent && <Badge variant="default" className="text-[10px] bg-blue-600">Actual</Badge>}
                        {lider.is_from_personas && !isCurrent && <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">Nuevo en discipulado</Badge>}
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
                        onClick={() => handleAssign(lider)}
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Asignar
                      </Button>
                    )}
                  </div>
                );
              })}
              
              {combinedLideres.length === 0 && (
                <div className="text-center p-8 text-slate-500 text-sm">
                  {searchTerm.length < 2 
                    ? "Busca a cualquier persona por nombre para asignarla como líder." 
                    : "No se encontraron personas que coincidan con la búsqueda."}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
