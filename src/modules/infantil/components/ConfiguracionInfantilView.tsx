import { useState } from "react";
import { Settings, Shield, Printer, Clock, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ConfiguracionInfantilView() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      toast.success("Configuraciones guardadas correctamente");
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Configuración del Módulo
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Ajustes generales del ministerio infantil, impresoras y seguridad.</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl h-11 px-6 font-bold"
        >
          {isSaving ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-navy flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Seguridad y Check-in
            </CardTitle>
            <CardDescription>Reglas estrictas para la entrega y recepción de niños</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-slate-700">Firma digital requerida</Label>
                <p className="text-sm text-slate-500">Exigir firma en pantalla al recoger al niño.</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-slate-700">Alerta de Acudiente no principal</Label>
                <p className="text-sm text-slate-500">Avisar si alguien diferente al padre/madre recoge al niño.</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm font-bold text-slate-700">Tiempo límite de espera (Minutos)</Label>
              <Input type="number" defaultValue="15" className="h-12 rounded-xl bg-slate-50 border-slate-200 w-32" />
              <p className="text-xs text-slate-400">Minutos de gracia después de terminada la clase antes de alertar.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-navy flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-500" />
              Impresión de Carnés y Tickets
            </CardTitle>
            <CardDescription>Configuración de impresoras térmicas y códigos QR</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-slate-700">Imprimir sticker en Check-in</Label>
                <p className="text-sm text-slate-500">Genera un sticker autoadhesivo automático al entrar.</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-slate-700">Doble ticket de seguridad</Label>
                <p className="text-sm text-slate-500">Imprime un comprobante para el niño y otro para el acudiente.</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm font-bold text-slate-700">Servidor de Impresión (IP)</Label>
              <Input defaultValue="192.168.1.100:631" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
