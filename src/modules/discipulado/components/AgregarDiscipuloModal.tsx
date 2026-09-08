import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, UserPlus, Database, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgregarDiscipuloModalProps {
  isOpen: boolean;
  onClose: () => void;
  liderId: string;
  casaDePazId?: string | null;
  onSuccess: () => void;
}

export function AgregarDiscipuloModal({ isOpen, onClose, liderId, casaDePazId, onSuccess }: AgregarDiscipuloModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("buscar");
  
  // Buscar Estado
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Manual Estado
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('id, nombres, apellidos, telefono')
        .or(`nombres.ilike.%${term}%,apellidos.ilike.%${term}%`)
        .limit(10);
        
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Error buscando personas:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const saveDiscipulo = async (discipulo: { full_name: string, telefono?: string | null, notes?: string | null }) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('discipulos').insert({
        full_name: discipulo.full_name,
        telefono: discipulo.telefono || null,
        notes: discipulo.notes || null,
        lider_id: liderId,
        casa_de_paz_id: casaDePazId || null,
        status: 'Activo'
      });

      if (error) throw error;

      toast.success(`${discipulo.full_name} añadido exitosamente.`);
      onSuccess();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error agregando discípulo", err);
      toast.error(err.message || "Ocurrió un error al guardar el discípulo.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    saveDiscipulo({
      full_name: manualName.trim(),
      telefono: manualPhone.trim(),
      notes: manualNotes.trim(),
    });
  };

  const resetForm = () => {
    setSearchTerm("");
    setSearchResults([]);
    setManualName("");
    setManualPhone("");
    setManualNotes("");
    setActiveTab("buscar");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-600" />
            Agregar Discípulo
          </DialogTitle>
          <DialogDescription>
            Busca a la persona en la base de datos de la iglesia o añádela manualmente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buscar" className="flex gap-2 items-center">
              <Database className="w-4 h-4" /> Buscar Persona
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex gap-2 items-center">
              <User className="w-4 h-4" /> Crear Manual
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buscar" className="py-4 space-y-4 min-h-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escribe al menos 3 letras para buscar..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            <div className="border rounded-md divide-y overflow-hidden flex-1 max-h-[220px] overflow-y-auto">
              {searchTerm.length < 3 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Comienza a escribir para buscar personas en la base de datos.
                </div>
              ) : searchResults.length === 0 && !isSearching ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No se encontraron resultados. Intenta buscar de otra manera o usa la opción "Crear Manual".
                </div>
              ) : (
                searchResults.map(persona => {
                  const nombreCompleto = `${persona.nombres} ${persona.apellidos}`.trim();
                  return (
                    <div key={persona.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{nombreCompleto}</p>
                        {persona.telefono && <p className="text-xs text-slate-500">{persona.telefono}</p>}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={loading}
                        onClick={() => saveDiscipulo({
                          full_name: nombreCompleto,
                          telefono: persona.telefono
                        })}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="manual" className="py-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  placeholder="Ej. Juan Pérez" 
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                <Input 
                  id="phone" 
                  placeholder="Ej. +584120000000" 
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Información adicional..." 
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  disabled={loading}
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!manualName.trim() || loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Guardar Discípulo
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
