import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  MapPin,
  Clock,
  Calendar,
  User,
  Copy,
  Check,
  ExternalLink,
  Phone,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

export interface CasaDePazData {
  id: string;
  nombre: string;
  tipo: string;
  red: string | null;
  ubicacion: string | null;
  dia_reunion: string | null;
  hora_reunion: string | null;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  lider_id: string | null;
  lider_nombre?: string | null;
  lider_telefono?: string | null;
  lider_foto_url?: string | null;
  miembros_count?: number;
}

interface CasaDePazCardProps {
  casa: CasaDePazData;
}

const RED_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Hombres: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30" },
  Mujeres: { bg: "bg-pink-500/10 dark:bg-pink-500/20", text: "text-pink-700 dark:text-pink-400", border: "border-pink-500/30" },
  Jóvenes: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/30" },
  Matrimonios: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30" },
  Niños: { bg: "bg-sky-500/10 dark:bg-sky-500/20", text: "text-sky-700 dark:text-sky-400", border: "border-sky-500/30" },
};

export default function CasaDePazCard({ casa }: CasaDePazCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (!casa.ubicacion) return;
    navigator.clipboard.writeText(casa.ubicacion);
    setCopied(true);
    toast.success("Dirección copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const getGoogleMapsUrl = () => {
    if (casa.latitud && casa.longitud) {
      return `https://www.google.com/maps/search/?api=1&query=${casa.latitud},${casa.longitud}`;
    }
    if (casa.ubicacion) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(casa.ubicacion)}`;
    }
    return null;
  };

  const mapsUrl = getGoogleMapsUrl();
  const redStyle = (casa.red && RED_BADGE_STYLES[casa.red]) || {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
  };

  const cleanPhone = casa.lider_telefono ? casa.lider_telefono.replace(/[^0-9]/g, "") : null;

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-border/80 bg-card/80 backdrop-blur-sm">
      {/* Visual Accent Top Bar */}
      <div className={`h-1.5 w-full ${redStyle.bg.replace('/10', '/80').replace('/20', '/80')}`} />

      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 transition-transform group-hover:scale-105">
              <Home className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base text-foreground leading-snug truncate" title={casa.nombre}>
                {casa.nombre}
              </h3>
              {casa.red && (
                <Badge
                  variant="outline"
                  className={`mt-0.5 text-[11px] font-medium px-2 py-0.2 border ${redStyle.bg} ${redStyle.text} ${redStyle.border}`}
                >
                  Red {casa.red}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Ubicación / Dirección */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 text-xs">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground block">Dirección / Ubicación</span>
            <p className="text-muted-foreground truncate" title={casa.ubicacion || "Dirección no registrada"}>
              {casa.ubicacion || "Consulte con el líder responsable"}
            </p>
          </div>
          {casa.ubicacion && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={handleCopyAddress}
              title="Copiar dirección"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>

        {/* Día y Hora de Reunión */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-muted-foreground block">Día</span>
              <span className="font-medium text-foreground">{casa.dia_reunion || "Por definir"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-muted-foreground block">Hora</span>
              <span className="font-medium text-foreground">{casa.hora_reunion || "Por definir"}</span>
            </div>
          </div>
        </div>

        {/* Líder / Anfitrión */}
        <div className="flex items-center justify-between pt-2 border-t text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 border shrink-0">
              <AvatarImage src={casa.lider_foto_url || undefined} alt={casa.lider_nombre || "Líder"} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                {casa.lider_nombre ? casa.lider_nombre.slice(0, 2).toUpperCase() : <User className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block">Líder / Anfitrión</span>
              <span className="font-medium text-foreground truncate block" title={casa.lider_nombre || "Sin asignar"}>
                {casa.lider_nombre || "Sin líder asignado"}
              </span>
            </div>
          </div>

          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, quisiera solicitar información sobre la Casa de Paz ${casa.nombre}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition-colors shrink-0"
              title="Contactar por WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Contactar</span>
            </a>
          )}
        </div>

        {/* Botón de Google Maps */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium h-8 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors mt-1"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Ver ubicación en Google Maps</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
