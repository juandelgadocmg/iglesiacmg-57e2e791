import { useState } from "react";
import { Plus, Search, Filter, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNinos } from "../hooks/useNinos";
import { RegistrarNinoModal } from "./RegistrarNinoModal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function NinosList() {
  const { ninos, isLoading } = useNinos();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Registrar Niño
        </Button>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre..." 
            className="pl-9 bg-background" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNinos && filteredNinos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNinos.map((nino) => (
            <Card key={nino.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {nino.foto_url ? (
                      <img src={nino.foto_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{nino.nombres} {nino.apellidos}</h3>
                    <p className="text-xs text-muted-foreground">
                      {nino.detalles?.codigo_interno ? `ID: ${nino.detalles.codigo_interno}` : "Sin ID"}
                    </p>
                  </div>
                </div>
                <Badge variant={nino.estado_iglesia === 'Activo' ? 'default' : 'secondary'}>
                  {nino.estado_iglesia}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                {nino.detalles?.alergias && (
                  <p><span className="font-medium text-amber-600">Alergias:</span> {nino.detalles.alergias}</p>
                )}
                <p>Contacto Emergencia: {nino.detalles?.contacto_emergencia || 'No registrado'}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="p-12 text-center text-muted-foreground">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No se encontraron niños registrados.</p>
            <p className="text-sm">Agrega el primer registro para empezar.</p>
          </div>
        </div>
      )}

      <RegistrarNinoModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
