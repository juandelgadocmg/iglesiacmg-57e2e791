import { useState } from "react";
import { Plus, Search, Filter, Loader2, User, Users, Shirt, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNinos } from "../hooks/useNinos";
import { RegistrarNinoModal } from "./RegistrarNinoModal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function NinosList() {
  const { ninos, isLoading } = useNinos();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredNinos = ninos?.filter(nino => 
    `${nino.nombres} ${nino.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Directorio de Niños</h2>
          <p className="text-muted-foreground">Administra los registros de los niños del ministerio.</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Registrar Niño
        </Button>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre..." 
            className="pl-9 bg-background rounded-xl" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNinos && filteredNinos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNinos.map((nino) => (
            <Card key={nino.id} className="p-4 flex flex-col justify-between gap-3 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {nino.foto_url ? (
                        <img src={nino.foto_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        nino.nombres?.[0] || <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{nino.nombres} {nino.apellidos}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {nino.detalles?.codigo_interno ? `ID: ${nino.detalles.codigo_interno}` : `ID: ${(nino.id).slice(0, 8)}`}
                        {nino.documento ? ` · Doc: ${nino.documento}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={nino.estado_iglesia === 'Activo' ? 'default' : 'secondary'} className="text-[10px]">
                    {nino.estado_iglesia || "Activo"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-3 space-y-1">
                  {nino.detalles?.alergias ? (
                    <p className="text-amber-800 font-bold bg-amber-50 p-1 rounded border border-amber-200 text-[11px]">
                      ⚠️ Alergias: {nino.detalles.alergias}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Sin alergias conocidas</p>
                  )}
                  <p className="text-[11px]">Contacto: {nino.detalles?.contacto_emergencia || 'No registrado'}</p>
                </div>
              </div>

              {/* Acciones del niño */}
              <div className="pt-2 border-t flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold gap-1 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => navigate(`/infantil/carnes`)}
                >
                  <Shirt className="w-3.5 h-3.5 text-blue-600" />
                  Sticker Camiseta
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-2xl overflow-hidden bg-background">
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No se encontraron niños registrados.</p>
            <p className="text-xs mt-1">Haz clic en "Registrar Niño" para agregar el primero.</p>
          </div>
        </div>
      )}

      <RegistrarNinoModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
