import { useState, useMemo } from "react";
import {
  QrCode, Printer, Shield, User, AlertCircle, Shirt, Tag,
  AlertTriangle, CheckCircle2, Layers, Search, Download, Check
} from "lucide-react";
import { usePersonas } from "@/hooks/useDatabase";
import { useInfantilAcudientes, useInfantilGrupos } from "@/hooks/useInfantil";
import { useNinos } from "../hooks/useNinos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type PrintMode = "sticker" | "duo" | "planilla" | "carne";

export default function CarnesView() {
  const { data: personas, isLoading: isLoadingPersonas } = usePersonas();
  const { ninos, isLoading: isLoadingNinos } = useNinos();
  const { data: acudientes, isLoading: isLoadingAcudientes, isError: isErrorAcudientes } = useInfantilAcudientes();
  const { data: grupos } = useInfantilGrupos();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNinoId, setSelectedNinoId] = useState<string>("");
  const [printMode, setPrintMode] = useState<PrintMode>("sticker");
  const [selectedGrupoFiltro, setSelectedGrupoFiltro] = useState<string>("all");

  // Opciones de personalización de la etiqueta
  const [mostrarAlergias, setMostrarAlergias] = useState(true);
  const [mostrarTelefono, setMostrarTelefono] = useState(true);
  const [mostrarTalonAcudiente, setMostrarTalonAcudiente] = useState(true);

  const fechaHoy = useMemo(() => {
    try {
      return format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return new Date().toLocaleDateString("es-CO");
    }
  }, []);

  // Consolidar lista de niños: preferir personas con tipo 'Niño' o registrados en infantil
  const listaNinos = useMemo(() => {
    if (ninos && ninos.length > 0) {
      return ninos;
    }
    // Fallback con personas si useNinos aún está cargando
    return (personas || []).filter(p => {
      const tipos = Array.isArray(p.tipos_persona) ? p.tipos_persona : [];
      return tipos.includes("Niño");
    });
  }, [ninos, personas]);

  // Si la lista está vacía (ej. nueva instalación), permitir buscar en todas las personas
  const personasDisponibles = useMemo(() => {
    const fuente = listaNinos.length > 0 ? listaNinos : (personas || []);
    if (!searchTerm.trim()) return fuente.slice(0, 30);
    const q = searchTerm.toLowerCase().trim();
    return fuente.filter(p =>
      `${p.nombres ?? ""} ${p.apellidos ?? ""}`.toLowerCase().includes(q) ||
      (p.documento && p.documento.includes(q))
    ).slice(0, 40);
  }, [listaNinos, personas, searchTerm]);

  // Niño seleccionado
  const selectedNino = useMemo(() => {
    if (!selectedNinoId) return personasDisponibles[0] || null;
    return (
      (ninos || []).find(n => n.id === selectedNinoId) ||
      (personas || []).find(p => p.id === selectedNinoId) ||
      null
    );
  }, [selectedNinoId, ninos, personas, personasDisponibles]);

  // Acudientes del niño seleccionado
  const acudientesNino = useMemo(() => {
    if (!selectedNino) return [];
    return (acudientes || []).filter(a => a.nino_id === selectedNino.id);
  }, [selectedNino, acudientes]);

  const acudientePrincipal = useMemo(() => {
    return acudientesNino.find(a => a.es_principal) || acudientesNino[0] || null;
  }, [acudientesNino]);

  // Grupo asignado al niño
  const grupoNino = useMemo(() => {
    if (!selectedNino?.grupo_id) return null;
    return (grupos || []).find(g => g.id === selectedNino.grupo_id);
  }, [selectedNino, grupos]);

  // Generar código de seguridad corto (ej. #DK-481)
  const getSecurityCode = (id?: string) => {
    if (!id) return "000";
    return id.replace(/-/g, "").slice(0, 4).toUpperCase();
  };

  const handlePrint = (mode: PrintMode) => {
    setPrintMode(mode);
    toast.info("Abriendo diálogo de impresión...", {
      description: "Asegúrate de seleccionar tu impresora de etiquetas o papel adhesivo."
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Niños filtrados para la planilla en lote
  const ninosPlanilla = useMemo(() => {
    const fuente = listaNinos.length > 0 ? listaNinos : (personas || []);
    if (selectedGrupoFiltro === "all") return fuente.slice(0, 24);
    return fuente.filter(n => n.grupo_id === selectedGrupoFiltro).slice(0, 24);
  }, [listaNinos, personas, selectedGrupoFiltro]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      {/* CABECERA (Oculta al imprimir) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
            <Shirt className="w-3.5 h-3.5" /> Impresión de Etiquetas Adhesivas para Camisetas
          </div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
            Stickers y Carnés con Código QR
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Imprime adhesivos físicos para pegar en la ropa de los niños y talones de seguridad para padres.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handlePrint("sticker")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 font-bold shadow-lg shadow-blue-500/20"
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimir Sticker Individual
          </Button>
          <Button
            onClick={() => handlePrint("planilla")}
            variant="outline"
            className="rounded-xl h-11 px-4 border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Layers className="w-4 h-4 mr-2" /> Planilla en Lote
          </Button>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
        {/* PANEL IZQUIERDO: Búsqueda y Selección de Niño (4 columnas) */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" /> Seleccionar Niño / Niña
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Buscar por nombre o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
              />

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {isLoadingPersonas || isLoadingNinos ? (
                  <p className="text-center text-xs text-slate-400 py-6">Cargando lista de niños...</p>
                ) : personasDisponibles.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No se encontraron niños registrados con ese criterio.
                  </div>
                ) : (
                  personasDisponibles.map((p) => {
                    const isSelected = selectedNino?.id === p.id;
                    const tieneAlergia = !!(p.detalles?.alergias || (p as any).alergias);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedNinoId(p.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-navy text-white shadow-md shadow-navy/20"
                            : "hover:bg-slate-100 text-slate-700 bg-slate-50/60"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-sm truncate leading-tight">
                            {p.nombres} {p.apellidos}
                          </p>
                          <p className={`text-[11px] mt-0.5 truncate ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                            ID: {getSecurityCode(p.id)} {p.documento ? `· Doc: ${p.documento}` : ""}
                          </p>
                        </div>
                        {tieneAlergia && (
                          <span
                            title="Tiene alergias registradas"
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0"
                          >
                            ⚠️ Alergia
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* OPCIONES DE PERSONALIZACIÓN */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" /> Personalizar Etiqueta Adhesiva
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-alergias" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mostrar Alerta Médica / Alergias
                </Label>
                <Switch
                  id="sw-alergias"
                  checked={mostrarAlergias}
                  onCheckedChange={setMostrarAlergias}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sw-tel" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mostrar Teléfono del Acudiente
                </Label>
                <Switch
                  id="sw-tel"
                  checked={mostrarTelefono}
                  onCheckedChange={setMostrarTelefono}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sw-talon" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Incluir Talón de Retiro para el Padre
                </Label>
                <Switch
                  id="sw-talon"
                  checked={mostrarTalonAcudiente}
                  onCheckedChange={setMostrarTalonAcudiente}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA Y FORMATOS (8 columnas) */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)} className="w-full">
            <TabsList className="grid grid-cols-4 bg-slate-200/70 p-1 rounded-2xl h-12">
              <TabsTrigger value="sticker" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <Shirt className="w-3.5 h-3.5" /> Sticker Camiseta
              </TabsTrigger>
              <TabsTrigger value="duo" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <Shield className="w-3.5 h-3.5" /> Niño + Acudiente
              </TabsTrigger>
              <TabsTrigger value="planilla" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <Layers className="w-3.5 h-3.5" /> Planilla Grupo
              </TabsTrigger>
              <TabsTrigger value="carne" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <QrCode className="w-3.5 h-3.5" /> Carné Tradicional
              </TabsTrigger>
            </TabsList>

            {/* VISTA 1: STICKER INDIVIDUAL DE CAMISETA */}
            <TabsContent value="sticker" className="mt-6">
              {selectedNino ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl mb-4 text-xs text-blue-800 flex items-center gap-2 max-w-md w-full">
                    <Shirt className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>Formato físico:</strong> Tamaño sticker autoadhesivo para pegar en la camiseta del niño.</span>
                  </div>

                  {/* Render del Sticker de Camiseta */}
                  <div className="printable-single-sticker-wrapper">
                    <ShirtStickerComponent
                      nino={selectedNino}
                      acudiente={acudientePrincipal}
                      grupo={grupoNino}
                      fecha={fechaHoy}
                      mostrarAlergias={mostrarAlergias}
                      mostrarTelefono={mostrarTelefono}
                    />
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={() => handlePrint("sticker")}
                      size="lg"
                      className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8 h-12 shadow-lg shadow-navy/20 font-bold"
                    >
                      <Printer className="w-5 h-5 mr-2" /> Imprimir Etiqueta Adhesiva
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                  <Shirt className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p>Selecciona un niño para generar su sticker adhesivo.</p>
                </div>
              )}
            </TabsContent>

            {/* VISTA 2: DÚO STICKER CAMISETA + TALÓN ACUDIENTE */}
            <TabsContent value="duo" className="mt-6">
              {selectedNino ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl mb-4 text-xs text-amber-900 flex items-center gap-2 max-w-md w-full">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>Protocolo de seguridad:</strong> 1 sticker para la ropa del niño y 1 comprobante para el acudiente.</span>
                  </div>

                  <div className="printable-duo-wrapper space-y-3">
                    <ShirtStickerComponent
                      nino={selectedNino}
                      acudiente={acudientePrincipal}
                      grupo={grupoNino}
                      fecha={fechaHoy}
                      mostrarAlergias={mostrarAlergias}
                      mostrarTelefono={mostrarTelefono}
                    />
                    {mostrarTalonAcudiente && (
                      <ParentClaimTagComponent
                        nino={selectedNino}
                        acudiente={acudientePrincipal}
                        fecha={fechaHoy}
                      />
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={() => handlePrint("duo")}
                      size="lg"
                      className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8 h-12 shadow-lg shadow-navy/20 font-bold"
                    >
                      <Printer className="w-5 h-5 mr-2" /> Imprimir Par (Niño + Acudiente)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                  <Shield className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p>Selecciona un niño para ver el dúo de seguridad.</p>
                </div>
              )}
            </TabsContent>

            {/* VISTA 3: PLANILLA EN LOTE PARA TODO EL GRUPO */}
            <TabsContent value="planilla" className="mt-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Filtrar por Grupo:
                    </Label>
                    <Select value={selectedGrupoFiltro} onValueChange={setSelectedGrupoFiltro}>
                      <SelectTrigger className="w-[200px] h-10 rounded-xl bg-slate-50 border-slate-200 font-semibold text-xs">
                        <SelectValue placeholder="Todos los grupos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los grupos ({listaNinos.length})</SelectItem>
                        {(grupos || []).map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => handlePrint("planilla")}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 font-bold"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Planilla ({ninosPlanilla.length} Stickers)
                  </Button>
                </div>

                {/* Cuadrícula de stickers para impresión en lote */}
                <div className="printable-batch-sheet grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100 p-4 rounded-2xl border border-slate-200">
                  {ninosPlanilla.map((n) => {
                    const rels = (acudientes || []).filter(a => a.nino_id === n.id);
                    const acu = rels.find(a => a.es_principal) || rels[0] || null;
                    const grp = (grupos || []).find(g => g.id === n.grupo_id);
                    return (
                      <div key={n.id} className="batch-sticker-item">
                        <ShirtStickerComponent
                          nino={n}
                          acudiente={acu}
                          grupo={grp}
                          fecha={fechaHoy}
                          mostrarAlergias={mostrarAlergias}
                          mostrarTelefono={mostrarTelefono}
                          compact
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* VISTA 4: CARNÉ TRADICIONAL VERTICAL */}
            <TabsContent value="carne" className="mt-6">
              {selectedNino ? (
                <div className="flex flex-col items-center">
                  <div className="printable-carne-wrapper w-full max-w-sm">
                    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
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
                          <QRCodeSVG
                            value={selectedNino.qr_code || selectedNino.id}
                            size={140}
                            level="H"
                            includeMargin={true}
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 font-mono tracking-widest mb-4">
                          ID: {getSecurityCode(selectedNino.id)}
                        </p>

                        {/* Acudientes autorizados */}
                        <div className="w-full space-y-2">
                          {acudientesNino.map((a) => (
                            <div key={a.id} className="bg-slate-50 p-2 rounded-lg text-xs flex justify-between items-center border border-slate-100">
                              <div>
                                <p className="font-bold text-navy">{a.acudiente?.nombres} {a.acudiente?.apellidos}</p>
                                <p className="text-slate-500 text-[10px]">{a.relacion}</p>
                              </div>
                              {a.autorizado_recoger && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] h-5">
                                  Autorizado
                                </Badge>
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
                  </div>

                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => handlePrint("carne")}
                      className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8 h-12 shadow-lg shadow-navy/20 font-bold"
                    >
                      <Printer className="h-5 w-5 mr-2" /> Imprimir Carné Tradicional
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                  <QrCode className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
                  <p>Selecciona un niño para generar su carné.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ÁREA DE IMPRESIÓN FÍSICA PURA (Solo visible en @media print) */}
      <div className="hidden print:block printable-area">
        {printMode === "sticker" && selectedNino && (
          <div className="print-single-sticker-container">
            <ShirtStickerComponent
              nino={selectedNino}
              acudiente={acudientePrincipal}
              grupo={grupoNino}
              fecha={fechaHoy}
              mostrarAlergias={mostrarAlergias}
              mostrarTelefono={mostrarTelefono}
            />
          </div>
        )}

        {printMode === "duo" && selectedNino && (
          <div className="print-duo-container space-y-4">
            <ShirtStickerComponent
              nino={selectedNino}
              acudiente={acudientePrincipal}
              grupo={grupoNino}
              fecha={fechaHoy}
              mostrarAlergias={mostrarAlergias}
              mostrarTelefono={mostrarTelefono}
            />
            {mostrarTalonAcudiente && (
              <ParentClaimTagComponent
                nino={selectedNino}
                acudiente={acudientePrincipal}
                fecha={fechaHoy}
              />
            )}
          </div>
        )}

        {printMode === "planilla" && (
          <div className="print-sheet-grid">
            {ninosPlanilla.map((n) => {
              const rels = (acudientes || []).filter(a => a.nino_id === n.id);
              const acu = rels.find(a => a.es_principal) || rels[0] || null;
              const grp = (grupos || []).find(g => g.id === n.grupo_id);
              return (
                <div key={n.id} className="print-sheet-item">
                  <ShirtStickerComponent
                    nino={n}
                    acudiente={acu}
                    grupo={grp}
                    fecha={fechaHoy}
                    mostrarAlergias={mostrarAlergias}
                    mostrarTelefono={mostrarTelefono}
                    compact
                  />
                </div>
              );
            })}
          </div>
        )}

        {printMode === "carne" && selectedNino && (
          <div className="print-carne-container flex justify-center items-center h-full">
            <div className="w-[340px] bg-white rounded-2xl border-2 border-slate-300 p-6 text-center">
              <div className="border-b pb-3 mb-4">
                <h3 className="font-black text-lg text-slate-900 uppercase">DOXA KIDS</h3>
                <p className="text-xs text-slate-500">Centro Mundial de Gloria</p>
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {selectedNino.nombres}
                <br />
                {selectedNino.apellidos}
              </h2>
              <div className="my-4 flex justify-center">
                <QRCodeSVG
                  value={selectedNino.qr_code || selectedNino.id}
                  size={140}
                  level="H"
                />
              </div>
              <p className="font-mono text-xs font-bold text-slate-500">
                ID: {getSecurityCode(selectedNino.id)}
              </p>
              {selectedNino.detalles?.alergias && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-1 rounded">
                  ALERGIA: {selectedNino.detalles.alergias}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ESTILOS DE IMPRESIÓN FÍSICA PARA ETIQUETAS ADHESIVAS Y TERMICAS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: auto;
            margin: 4mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ocultar todo el sistema de la web */
          body * {
            visibility: hidden !important;
          }
          /* Hacer visible únicamente el área designada de impresión */
          .printable-area, .printable-area * {
            visibility: visible !important;
          }
          .printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .print-single-sticker-container, .print-duo-container {
            page-break-inside: avoid !important;
          }
          .print-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6mm !important;
            page-break-inside: avoid !important;
          }
          .print-sheet-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .shirt-sticker-box {
            border: 2px solid #000 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}

// --------------------------------------------------------------------------------
// COMPONENTE: STICKER ADHESIVO DE CAMISETA (Shirt Sticker Component)
// Diseñado con alta legibilidad para que el nombre del niño se lea a 3 metros.
// --------------------------------------------------------------------------------
export function ShirtStickerComponent({
  nino,
  acudiente,
  grupo,
  fecha,
  mostrarAlergias = true,
  mostrarTelefono = true,
  compact = false
}: {
  nino: any;
  acudiente?: any;
  grupo?: any;
  fecha: string;
  mostrarAlergias?: boolean;
  mostrarTelefono?: boolean;
  compact?: boolean;
}) {
  const securityCode = (nino?.id || "0000").replace(/-/g, "").slice(0, 4).toUpperCase();
  const alergias = nino?.detalles?.alergias || nino?.alergias;
  const telefonoContacto =
    acudiente?.acudiente?.telefono ||
    acudiente?.acudiente?.whatsapp ||
    nino?.detalles?.contacto_emergencia ||
    nino?.telefono;

  return (
    <div
      className={`shirt-sticker-box bg-white rounded-2xl border-2 border-dashed border-slate-300 p-4 shadow-sm relative text-slate-900 font-sans transition-all ${
        compact ? "w-full max-w-[320px]" : "w-full max-w-[360px]"
      }`}
    >
      {/* Indicador visual de etiqueta adhesiva despegable */}
      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow print:hidden">
        <Shirt className="w-3.5 h-3.5" />
      </div>

      {/* Cabecera DOXA Kids */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-blue-700 flex items-center justify-center text-white font-black text-[10px] shrink-0">
            DK
          </div>
          <div>
            <h4 className="font-black text-xs tracking-wider text-blue-900 uppercase leading-none">
              DOXA KIDS
            </h4>
            <p className="text-[9px] text-slate-500 font-semibold leading-none mt-0.5">
              Centro Mundial de Gloria
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-600 block leading-none">{fecha}</span>
          <span className="text-[9px] font-mono font-black text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
            #{securityCode}
          </span>
        </div>
      </div>

      {/* Cuerpo principal: Nombre en tamaño grande + QR */}
      <div className="flex items-start justify-between gap-3 my-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-950 leading-tight tracking-tight break-words">
            {nino.nombres}
          </h2>
          <p className="text-base font-bold text-slate-700 uppercase tracking-wide truncate">
            {nino.apellidos}
          </p>

          {/* Badge del Grupo / Aula */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-black uppercase">
            <Tag className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">{grupo?.nombre || "Infantil"}</span>
          </div>
        </div>

        {/* Código QR */}
        <div className="bg-white p-1 rounded-xl border-2 border-slate-200 shadow-sm shrink-0 flex flex-col items-center">
          <QRCodeSVG
            value={nino.qr_code || nino.id}
            size={compact ? 80 : 92}
            level="M"
            includeMargin={false}
          />
          <span className="text-[8px] font-mono font-black text-slate-400 mt-0.5">
            {securityCode}
          </span>
        </div>
      </div>

      {/* Alerta Médica / Alergias */}
      {mostrarAlergias && (
        alergias ? (
          <div className="mt-2 bg-amber-50 border-2 border-amber-300 text-amber-900 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">ALERGIA: {alergias}</span>
          </div>
        ) : (
          <div className="mt-2 bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Sin alergias conocidas</span>
          </div>
        )
      )}

      {/* Contacto de Emergencia / Acudiente */}
      <div className="mt-2.5 pt-1.5 border-t border-slate-200 text-[10px] flex justify-between items-center text-slate-600">
        <div className="truncate pr-1">
          <span className="font-bold text-slate-800">Acudiente: </span>
          <span>{acudiente?.acudiente?.nombres ? `${acudiente.acudiente.nombres} (${acudiente.relacion || 'Acudiente'})` : "Padre registrado"}</span>
        </div>
        {mostrarTelefono && telefonoContacto && (
          <div className="font-mono font-bold text-slate-800 whitespace-nowrap shrink-0">
            📞 {telefonoContacto}
          </div>
        )}
      </div>

      <div className="mt-2 text-center border-t border-dashed border-slate-200 pt-1">
        <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black">
          Adhesivo de Camiseta · Pegar en el pecho
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// COMPONENTE: TALÓN DE RETIRO PARA EL ACUDIENTE (Guardian Claim Tag)
// Se entrega al padre para comprobar su identidad al recoger al niño.
// --------------------------------------------------------------------------------
export function ParentClaimTagComponent({
  nino,
  acudiente,
  fecha
}: {
  nino: any;
  acudiente?: any;
  fecha: string;
}) {
  const securityCode = (nino?.id || "0000").replace(/-/g, "").slice(0, 4).toUpperCase();

  return (
    <div className="shirt-sticker-box w-full max-w-[360px] bg-amber-50/70 rounded-2xl border-2 border-dashed border-amber-300 p-3 shadow-sm relative text-slate-900 font-sans">
      <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="font-black text-xs uppercase tracking-wider text-amber-950">
            Talón de Retiro (Padres)
          </span>
        </div>
        <span className="font-mono text-xs font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
          #{securityCode}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Menor entregado:</p>
          <p className="text-base font-black text-slate-950 uppercase truncate leading-tight">
            {nino.nombres} {nino.apellidos}
          </p>
          <p className="text-[9px] text-slate-600 mt-1 leading-snug">
            Presenta este comprobante al maestro para autorizar la salida del menor.
          </p>
        </div>

        <div className="shrink-0 bg-white p-1 rounded-lg border border-amber-300">
          <QRCodeSVG value={nino.qr_code || nino.id} size={58} level="M" />
        </div>
      </div>
    </div>
  );
}
