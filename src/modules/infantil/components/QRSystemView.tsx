import { QrCode, ScanLine, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function QRSystemView() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
          <QrCode className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
          Sistema QR DOXA
        </h2>
        <p className="text-slate-500 mt-2 font-medium max-w-md mx-auto">
          El sistema de escaneo y generación de códigos QR está integrado directamente en los módulos de operación.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
          <CardContent className="p-8 text-center flex flex-col h-full items-center">
            <ScanLine className="w-16 h-16 text-emerald-500 mb-6" />
            <h3 className="text-xl font-bold text-navy mb-3">Escanear QR (Check-in)</h3>
            <p className="text-slate-500 mb-8 flex-1">
              Ve al módulo de Check-in / Check-out para activar la cámara y registrar la entrada o salida de un niño escaneando su carné.
            </p>
            <Button 
              onClick={() => navigate('/infantil/checkin')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 shadow-lg shadow-emerald-500/30 font-bold"
            >
              Ir a Check-in
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
          <CardContent className="p-8 text-center flex flex-col h-full items-center">
            <CreditCard className="w-16 h-16 text-blue-500 mb-6" />
            <h3 className="text-xl font-bold text-navy mb-3">Generar Carnés QR</h3>
            <p className="text-slate-500 mb-8 flex-1">
              Ve al módulo de Carnés para generar las identificaciones con los códigos criptográficos de cada niño e imprimirlos.
            </p>
            <Button 
              onClick={() => navigate('/infantil/carnes')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-12 shadow-lg shadow-blue-500/30 font-bold"
            >
              Ir a Carnés
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
