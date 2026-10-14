import { useState, useRef } from "react";
import { QrCode, Printer, Shield, User, AlertCircle } from "lucide-react";
import { usePersonas } from "@/hooks/useDatabase";
import { useInfantilAcudientes } from "@/hooks/useInfantil";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export default function CarnesView() {
  const { data: personas, isLoading: isLoadingPersonas } = usePersonas();
  const { data: acudientes, isLoading: isLoadingAcudientes, isError } = useInfantilAcudientes();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNino, setSelectedNino] = useState<any>(null);
  
  // We deduce "kids" by looking for people who are linked as "nino_id" in acudientes,
  // or we just show everyone to let the admin print a card for anyone.
  // For safety, let's just show all people but optimized by search to avoid a huge list.
  
  const filteredPersonas = personas?.filter(p => 
    (p.nombres + " " + p.apellidos).toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20) || []; // Limit to 20 for performance

  const handlePrint = () => {
    toast.info("Iniciando impresión del carné...");
    window.print();
  };

  const getAcudientesForNino = (ninoId: string) => {
    return acudientes?.filter(a => a.nino_id === ninoId) || [];
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Generador de Carnés
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Crea e imprime identificaciones seguras con código QR.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg text-slate-800">Buscar Niño</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Input 
                placeholder="Nombre o apellido..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4 h-12 rounded-xl bg-slate-50"
              />
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {isError ? (
                  <div className="text-center p-4 border border-red-200 bg-red-50 text-red-600 rounded-xl">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-xs font-bold">Error de conexión</p>
                    <p className="text-[10px]">Faltan tablas en la base de datos (infantil_acudientes). Ejecuta la migración en Supabase.</p>
                  </div>
                ) : isLoadingPersonas ? (
                  <p className="text-center text-sm text-slate-500 py-4">Cargando...</p>
                ) : filteredPersonas.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setSelectedNino(p)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedNino?.id === p.id ? 'bg-navy text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <p className="font-bold">{p.nombres} {p.apellidos}</p>
                    <p className={`text-xs ${selectedNino?.id === p.id ? 'text-blue-200' : 'text-slate-500'}`}>ID: {p.id.split("-")[0]}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 flex justify-center items-start">
          {selectedNino ? (
            <div className="w-full max-w-sm">
              <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 transform transition-all hover:scale-105 duration-500">
                {/* Cabecera del carné */}
                <div className="bg-gradient-to-br from-navy to-blue-800 text-white p-6 text-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                  <h3 className="font-black tracking-widest uppercase text-sm text-blue-200">DOXA Kids</h3>
                  <p className="text-xs opacity-70">Centro Mundial de Gloria</p>
                </div>
                
                {/* Cuerpo del carné */}
                <div className="p-6 flex flex-col items-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center -mt-16 mb-4 border-4 border-white shadow-md">
                    <User className="h-10 w-10 text-slate-300" />
                  </div>
                  
                  <h2 className="text-2xl font-black text-navy text-center leading-tight mb-1">
                    {selectedNino.nombres}
                    <br />
                    {selectedNino.apellidos}
                  </h2>
                  
                  <div className="w-full h-px bg-slate-100 my-4" />
                  
                  {/* QR Code */}
                  <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100 mb-4">
                    <QRCodeSVG value={selectedNino.id} size={150} level="H" includeMargin={true} />
                  </div>
                  
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest mb-6">
                    {selectedNino.id.split("-")[0]}
                  </p>

                  <div className="w-full space-y-2">
                    {getAcudientesForNino(selectedNino.id).map(a => (
                      <div key={a.id} className="bg-slate-50 p-2 rounded-lg text-xs flex justify-between items-center border border-slate-100">
                        <div>
                          <p className="font-bold text-navy">{a.acudiente?.nombres}</p>
                          <p className="text-slate-500">{a.relacion}</p>
                        </div>
                        {a.autorizado_recoger && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] h-5">Autorizado</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
                
                {/* Pie del carné */}
                <div className="bg-coral p-3 text-center">
                  <p className="text-[10px] text-white font-bold uppercase tracking-wider">Identificación Intransferible</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center print:hidden">
                <Button onClick={handlePrint} className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8 h-12 shadow-lg shadow-navy/20">
                  <Printer className="h-5 w-5 mr-2" /> Imprimir Carné
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
              <QrCode className="h-16 w-16 mb-4 text-slate-300" />
              <p>Selecciona un niño para generar su carné.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Estilos para impresión (Oculta todo excepto el carné) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-sm, .max-w-sm * {
            visibility: visible;
          }
          .max-w-sm {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
      `}} />
    </div>
  );
}
