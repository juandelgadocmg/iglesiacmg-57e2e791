import { QrCode, ScanLine, CreditCard, Shirt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function QRSystemView() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full flex flex-col items-center justify-center">
      <div className="text-center mb-6">
        <div className="mx-auto w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
          <QrCode className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
          Sistema QR & Adhesivos DOXA
        </h2>
        <p className="text-slate-500 mt-2 font-medium max-w-md mx-auto text-sm">
          Control de acceso rápido, escaneo con cámara y generación de stickers adhesivos físicos para camisetas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-2 transition-transform duration-300 bg-white">
          <CardContent className="p-6 text-center flex flex-col h-full items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Shirt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-2">Stickers de Camiseta (Check-In)</h3>
            <p className="text-xs text-slate-500 mb-6 flex-1">
              Al imprimir el sticker adhesivo del niño, la plataforma registra automáticamente su Check-In sin necesidad de leer el código QR.
            </p>
            <Button 
              onClick={() => navigate('/infantil/carnes')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 shadow-lg shadow-blue-500/20 font-bold text-xs"
            >
              Imprimir Stickers (Check-In)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-2 transition-transform duration-300 bg-white">
          <CardContent className="p-6 text-center flex flex-col h-full items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ScanLine className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-2">Leer QR para Check-Out (Salida)</h3>
            <p className="text-xs text-slate-500 mb-6 flex-1">
              Activa la cámara para leer el código QR del sticker del niño o del talón del padre y autorizar la entrega segura (Check-Out).
            </p>
            <Button 
              onClick={() => navigate('/infantil/checkin')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-lg shadow-emerald-500/20 font-bold text-xs"
            >
              Ir a Check-In / Check-Out
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-2 transition-transform duration-300 bg-white">
          <CardContent className="p-6 text-center flex flex-col h-full items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-2">Carnés Tradicionales</h3>
            <p className="text-xs text-slate-500 mb-6 flex-1">
              Genera credenciales verticales plastificadas para colgar con lanyard con los datos del acudiente y código de seguridad.
            </p>
            <Button 
              onClick={() => navigate('/infantil/carnes')}
              variant="outline"
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl h-11 font-bold text-xs"
            >
              Ver Carnés
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
