import { useEffect, useRef, useState, useMemo } from "react";
import {
  QrCode, Search, UserCheck, ShieldCheck, AlertTriangle,
  LogIn, LogOut, Printer, Shirt, CheckCircle2, X
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useInfantilAsistencias,
  useInfantilCheckIn,
  useInfantilCheckOut,
  useInfantilGrupos,
  useInfantilAcudientes
} from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { useNinos, matchInfantilGrupoByAge, getSavedInfantilGrupoMap, saveInfantilGrupoForNino } from "../hooks/useNinos";
import { ShirtStickerComponent, extractNinoIdentifierFromQr } from "./CarnesView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QrEventoScanner from "@/components/attendance/QrEventoScanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CheckInView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<"entrada" | "salida">("entrada");
  const [showScanner, setShowScanner] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const handledUrlQrRef = useRef<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const fechaHoyTexto = useMemo(() => {
    try {
      return format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return new Date().toLocaleDateString("es-CO");
    }
  }, []);

  const { data: asistencias, isLoading: isLoadingAsistencias } = useInfantilAsistencias(today);
  const { data: personas } = usePersonas();
  const { ninos } = useNinos();
  const { data: grupos } = useInfantilGrupos();
  const { data: acudientes } = useInfantilAcudientes();

  const checkIn = useInfantilCheckIn();
  const checkOut = useInfantilCheckOut();

  // Modal de confirmación tras Check-In para imprimir Sticker de Camiseta
  const [checkedInNino, setCheckedInNino] = useState<any | null>(null);
  const [checkedInGrupo, setCheckedInGrupo] = useState<any | null>(null);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);

  // Modal de confirmación para Check-Out
  const [checkOutNino, setCheckOutNino] = useState<any | null>(null);
  const [selectedAsistenciaId, setSelectedAsistenciaId] = useState<string>("");
  const [recogidoPorId, setRecogidoPorId] = useState<string>("");
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);

  // Seleccionar o auto-detectar grupo para la entrada
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>("");

  const grupoActivo = useMemo(() => {
    if (selectedGrupoId) return grupos?.find(g => g.id === selectedGrupoId) || null;
    return grupos?.[0] || null;
  }, [selectedGrupoId, grupos]);

  // Resolver el grupo infantil real de un niño (ignorando grupo_id de Casa de Paz si vino de membresía)
  const resolveChildInfantilGrupo = (child: any) => {
    if (!grupos || grupos.length === 0) return null;
    if (child?.grupo_id) {
      const direct = grupos.find(g => g.id === child.grupo_id);
      if (direct) return direct;
    }
    const savedMap = getSavedInfantilGrupoMap();
    const savedId = child?.id ? savedMap[child.id] : undefined;
    if (savedId) {
      const fromSaved = grupos.find(g => g.id === savedId);
      if (fromSaved) return fromSaved;
    }
    if (selectedGrupoId) {
      const fromSelected = grupos.find(g => g.id === selectedGrupoId);
      if (fromSelected) return fromSelected;
    }
    return matchInfantilGrupoByAge(child?.fecha_nacimiento, grupos) || grupoActivo || grupos[0] || null;
  };

  // Lista de niños activos en clase hoy
  const ninosEnClase = useMemo(() => {
    return (asistencias || []).filter(a => !a.hora_salida);
  }, [asistencias]);

  // Helper de normalización para ignorar tildes y mayúsculas
  const normalizeText = (str: string) =>
    (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Sugerencias en tiempo real mientras el usuario escribe
  const liveSuggestions = useMemo(() => {
    const raw = searchCode.trim();
    if (raw.length < 2) return [];
    const clean = normalizeText(raw);
    const tokens = clean.split(/\s+/).filter(Boolean);
    const pool = (ninos && ninos.length > 0 ? ninos : personas || []);

    return pool.filter(x => {
      const full = normalizeText(`${x.nombres ?? ""} ${x.apellidos ?? ""}`);
      const doc = normalizeText(x.documento ?? "");
      const shortHex = x.id.replace(/-/g, "").toLowerCase();
      return tokens.every(t => full.includes(t) || doc.includes(t) || shortHex.startsWith(t.replace(/^#/, "")));
    }).slice(0, 6);
  }, [searchCode, ninos, personas]);

  // Buscar niño por código QR (URL o ID o código corto #XXXX), documento o palabras en el nombre
  const findChild = (codeOrId: string) => {
    const extracted = extractNinoIdentifierFromQr(codeOrId);
    const raw = (extracted || codeOrId || "").trim();
    if (!raw) return null;
    const clean = normalizeText(raw);
    const cleanHex = raw.replace(/^#/, "").replace(/-/g, "").toLowerCase();

    // 1. Coincidencia exacta o por prefijo de ID / código QR (#0548 o 0548ef30)
    let n = (ninos || []).find(p =>
      p.id.toLowerCase() === raw.toLowerCase() ||
      (cleanHex.length >= 4 && p.id.replace(/-/g, "").toLowerCase().startsWith(cleanHex)) ||
      (p.detalles?.qr_codigo && p.detalles.qr_codigo.toLowerCase() === raw.toLowerCase()) ||
      (p.detalles?.codigo_interno && p.detalles.codigo_interno.toLowerCase() === raw.toLowerCase())
    );
    if (n) return n;

    let p = (personas || []).find(x =>
      x.id.toLowerCase() === raw.toLowerCase() ||
      (cleanHex.length >= 4 && x.id.replace(/-/g, "").toLowerCase().startsWith(cleanHex)) ||
      (x as any).qr_code?.toLowerCase() === raw.toLowerCase()
    );
    if (p) return p;

    // 2. Coincidencia por documento (exacta o limpia)
    n = (ninos || []).find(x => x.documento && normalizeText(x.documento) === clean);
    if (n) return n;

    p = (personas || []).find(x => x.documento && normalizeText(x.documento) === clean);
    if (p) return p;

    // 3. Coincidencia por palabras del nombre (ej. "Samuel Gomez" coincide con "Samuel David Gomez Espinel")
    const tokens = clean.split(/\s+/).filter(Boolean);
    const pool = (ninos && ninos.length > 0 ? ninos : personas || []);
    const matches = pool.filter(x => {
      const full = normalizeText(`${x.nombres ?? ""} ${x.apellidos ?? ""}`);
      const doc = normalizeText(x.documento ?? "");
      return tokens.every(t => full.includes(t) || doc.includes(t));
    });

    return matches[0] || null;
  };

  const processChildAction = async (childIdOrCode: string) => {
    const child = findChild(childIdOrCode);

    if (!child) {
      toast.error("Niño no encontrado", {
        description: "No se encontró ningún registro con ese código QR, documento o nombre."
      });
      return;
    }

    if (mode === "entrada") {
      // ENTRADA: Resolver siempre un grupo infantil válido (nunca usar el grupo_id de Casa de Paz de membresía)
      const targetGrupo = resolveChildInfantilGrupo(child);
      const grupoTargetId = targetGrupo?.id;
      if (!grupoTargetId) {
        toast.error("No hay grupos infantiles configurados", {
          description: "Crea primero un grupo en la sección 'Grupos por Edad'."
        });
        return;
      }

      // Guardar la asignación del niño al grupo infantil si aún no la tenía
      saveInfantilGrupoForNino(child.id, grupoTargetId);
      if (child.grupo_id !== grupoTargetId) {
        supabase.from("personas").update({ grupo_id: grupoTargetId }).eq("id", child.id).then(() => {});
      }

      // Buscar acudiente principal
      const rels = (acudientes || []).filter(a => a.nino_id === child.id);
      const acuPrincipal = rels.find(a => a.es_principal) || rels[0] || null;

      try {
        await checkIn.mutateAsync({
          nino_id: child.id,
          grupo_id: grupoTargetId,
          entregado_por_id: acuPrincipal?.acudiente_id || undefined,
          observaciones: "Check-in rápido"
        });

        toast.success(`✓ Check-in registrado: ${child.nombres} ${child.apellidos} (${targetGrupo?.nombre || "Infantil"})`);
        setCheckedInNino({ ...child, grupo_id: grupoTargetId });
        setCheckedInGrupo(targetGrupo);
        setCheckInDialogOpen(true);
        setSearchCode("");
      } catch (err: any) {
        toast.error("Error al registrar check-in", {
          description: err.message || "Por favor intenta de nuevo."
        });
      }
    } else {
      // SALIDA: Verificar registro de entrada activo
      const asis = (asistencias || []).find(a => a.nino_id === child.id && !a.hora_salida);
      if (!asis) {
        toast.error("Sin entrada activa", {
          description: `${child.nombres} no tiene un registro de entrada activo hoy.`
        });
        return;
      }

      setCheckOutNino(child);
      setSelectedAsistenciaId(asis.id);
      setCheckOutDialogOpen(true);
      setSearchCode("");
    }
  };

  // Soportar escaneo directo con cámara nativa del celular (?c=XXXX o ?qr=XXXX)
  useEffect(() => {
    const qrParam = searchParams.get("c") || searchParams.get("qr") || searchParams.get("code");
    if (!qrParam) return;
    if (handledUrlQrRef.current === qrParam) return;
    if ((!ninos || ninos.length === 0) && (!personas || personas.length === 0)) return;
    if (!grupos || grupos.length === 0) return;

    handledUrlQrRef.current = qrParam;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("c");
    nextParams.delete("qr");
    nextParams.delete("code");
    setSearchParams(nextParams, { replace: true });
    processChildAction(qrParam);
  }, [searchParams, ninos, personas, grupos]);

  const handleManualSearch = () => {
    if (!searchCode.trim()) return;
    processChildAction(searchCode);
  };

  const handleQrScan = (data: string) => {
    setShowScanner(false);
    processChildAction(data);
  };

  const confirmCheckOut = async () => {
    if (!selectedAsistenciaId) return;
    try {
      await checkOut.mutateAsync({
        asistencia_id: selectedAsistenciaId,
        recogido_por_id: recogidoPorId || undefined
      });
      toast.success("✓ Salida registrada con éxito");
      setCheckOutDialogOpen(false);
      setCheckOutNino(null);
      setSelectedAsistenciaId("");
      setRecogidoPorId("");
    } catch (err: any) {
      toast.error("Error al registrar salida", { description: err.message });
    }
  };

  const printStickerNow = () => {
    window.print();
  };

  // Acudientes autorizados para el niño que se retira
  const acudientesCheckOut = useMemo(() => {
    if (!checkOutNino) return [];
    return (acudientes || []).filter(a => a.nino_id === checkOutNino.id);
  }, [checkOutNino, acudientes]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
            <Shirt className="w-3.5 h-3.5" /> Check-in con Impresión Inmediata de Stickers
          </div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Control de Acceso Infantil
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Escanea el carné o busca por nombre para imprimir el adhesivo de la camiseta al instante.
          </p>
        </div>

        {/* SELECTOR MODO ENTRADA / SALIDA */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit">
          <button
            onClick={() => setMode("entrada")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              mode === "entrada"
                ? "bg-navy text-white shadow-md shadow-navy/20"
                : "text-slate-500 hover:text-navy hover:bg-slate-50"
            }`}
          >
            <LogIn className="h-4 w-4" /> Entrada (Check-In)
          </button>
          <button
            onClick={() => setMode("salida")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              mode === "salida"
                ? "bg-coral text-white shadow-md shadow-coral/20"
                : "text-slate-500 hover:text-coral hover:bg-slate-50"
            }`}
          >
            <LogOut className="h-4 w-4" /> Salida (Check-Out)
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL (Oculto al imprimir) */}
      <div className="grid lg:grid-cols-2 gap-8 print:hidden">
        {/* PANEL IZQUIERDO: CÁMARA ESCÁNER QR */}
        <Card className="border-0 shadow-xl shadow-navy/5 bg-white rounded-3xl overflow-hidden">
          <div className={`h-2 w-full ${mode === "entrada" ? "bg-gradient-to-r from-blue-500 to-navy" : "bg-gradient-to-r from-coral to-orange-500"}`} />
          <CardHeader className="pb-3 pt-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-navy">
              <div className={`p-2 rounded-xl ${mode === "entrada" ? "bg-blue-50 text-blue-600" : "bg-coral/10 text-coral"}`}>
                <QrCode className="w-5 h-5" />
              </div>
              {mode === "entrada" ? "Escanear Carné o Código QR" : "Escanear QR de Retiro / Salida"}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center min-h-[300px] p-6">
            {showScanner ? (
              <div className="w-full max-w-[320px] overflow-hidden rounded-2xl border-4 border-blue-600 shadow-xl relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 z-20 bg-white/80 hover:bg-white text-slate-800 rounded-full h-8 w-8"
                  onClick={() => setShowScanner(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <QrEventoScanner
                  onScan={handleQrScan}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-44 h-44 border-4 border-dashed rounded-3xl flex items-center justify-center bg-slate-50 relative group cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setShowScanner(true)}>
                  <QrCode className="w-16 h-16 text-slate-300 group-hover:scale-110 transition-transform text-blue-500" />
                  <div className="absolute inset-0 bg-blue-500/5 rounded-3xl" />
                </div>
                <p className="mt-5 text-sm text-slate-500 max-w-xs">
                  {mode === "entrada"
                    ? "Apunta la cámara al carné o teléfono con QR para registrar la entrada e imprimir el sticker de camiseta."
                    : "Apunta la cámara al carné del niño o talón del padre para autorizar la entrega segura."}
                </p>
                <Button
                  className="mt-4 px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                  onClick={() => setShowScanner(true)}
                >
                  Activar Cámara QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PANEL DERECHO: BÚSQUEDA MANUAL Y ACTIVIDAD RECIENTE */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Search className="w-4 h-4 text-slate-400" /> Búsqueda Manual / Código
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {mode === "entrada" && grupos && grupos.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Grupo de Asignación:</label>
                  <Select value={selectedGrupoId || grupos[0]?.id} onValueChange={setSelectedGrupoId}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold text-xs">
                      <SelectValue placeholder="Seleccionar grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.nombre} ({g.edades || "Edades varias"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre, ID o Documento:</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej. Samuel Gomez, documento o ID..."
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-navy"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={checkIn.isPending || checkOut.isPending}
                    className="h-12 px-6 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold shrink-0"
                  >
                    {mode === "entrada" ? "Registrar" : "Validar"}
                  </Button>
                </div>

                {/* Dropdown de sugerencias en vivo */}
                {liveSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {liveSuggestions.map((child: any) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => processChildAction(child.id)}
                        className="w-full text-left p-3 hover:bg-blue-50/70 flex items-center justify-between transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-bold text-navy group-hover:text-coral transition-colors truncate">
                            {child.nombres} {child.apellidos}
                          </p>
                          <p className="text-xs text-slate-500">
                            {child.documento ? `Doc: ${child.documento} · ` : ""}
                            {resolveChildInfantilGrupo(child)?.nombre || "Infantil"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-navy font-semibold shrink-0 group-hover:bg-navy group-hover:text-white transition-colors">
                          {mode === "entrada" ? "Registrar Entrada" : "Registrar Salida"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Protocolo de seguridad */}
              <div className="pt-4 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg w-fit text-xs font-bold mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Protocolo de Protección Infantil
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Al completar el check-in, pega el <strong>sticker autoadhesivo en el pecho de la camiseta</strong> del niño y entrega el talón de comprobante al acudiente.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* LISTA DE ACTIVIDAD DE HOY */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Niños en el Ministerio Hoy ({ninosEnClase.length} en clase)
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-white text-slate-600">
                Total: {(asistencias || []).length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0 max-h-[260px] overflow-y-auto custom-scrollbar">
              {isLoadingAsistencias ? (
                <p className="p-6 text-xs text-center text-slate-400">Cargando asistencias de hoy...</p>
              ) : (asistencias || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay registros de asistencia para la fecha de hoy.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {asistencias?.map((a) => {
                    const grp = grupos?.find(g => g.id === a.grupo_id) || resolveChildInfantilGrupo(a.nino);
                    return (
                    <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {(a.nino as any)?.nombres} {(a.nino as any)?.apellidos}
                        </p>
                        <p className="text-xs text-slate-500">
                          {grp?.nombre || a.grupo?.nombre || "Infantil"} · In: {a.hora_entrada ? format(new Date(a.hora_entrada), "HH:mm") : "-"}
                          {a.hora_salida && ` · Salida: ${format(new Date(a.hora_salida), "HH:mm")}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {a.hora_salida ? (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                            Retirado
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500 text-white font-bold text-[10px]">
                            En Clase
                          </Badge>
                        )}
                        {!a.hora_salida && mode === "salida" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold border-coral text-coral hover:bg-coral hover:text-white"
                            onClick={() => {
                              setCheckOutNino(a.nino);
                              setSelectedAsistenciaId(a.id);
                              setCheckOutDialogOpen(true);
                            }}
                          >
                            Retirar
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIÁLOGO POST-CHECKIN: IMPRESIÓN INMEDIATA DEL STICKER DE CAMISETA */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden border-0 shadow-2xl print:hidden">
          <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-blue-600" />
          <DialogHeader className="p-6 pb-2 text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <DialogTitle className="text-2xl font-black text-navy">
              ¡Check-in Registrado!
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Imprime el sticker adhesivo para pegarlo en la camiseta del niño antes de entrar.
            </p>
          </DialogHeader>

          {checkedInNino && (
            <div className="px-6 py-2 flex flex-col items-center">
              <div className="printable-checkin-preview scale-90 -my-2 origin-top">
                <ShirtStickerComponent
                  nino={checkedInNino}
                  acudiente={(acudientes || []).find(a => a.nino_id === checkedInNino.id)}
                  grupo={checkedInGrupo || grupoActivo}
                  fecha={fechaHoyTexto}
                  compact
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-6 pt-3 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCheckInDialogOpen(false)}
              className="rounded-xl flex-1"
            >
              Cerrar
            </Button>
            <Button
              onClick={printStickerNow}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex-1 font-bold shadow-lg shadow-blue-500/20"
            >
              <Printer className="w-4 h-4 mr-2" /> Imprimir Sticker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE VALIDACIÓN DE CHECK-OUT (SALIDA) */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden border-0 shadow-2xl print:hidden">
          <div className="h-2 w-full bg-gradient-to-r from-coral to-orange-500" />
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-navy flex items-center gap-2">
              <LogOut className="w-5 h-5 text-coral" /> Confirmar Entrega de Niño
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Verifica que la persona que recoge al menor figure en la lista autorizada.
            </p>
          </DialogHeader>

          {checkOutNino && (
            <div className="px-6 py-3 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  {checkOutNino.nombres?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-navy">{checkOutNino.nombres} {checkOutNino.apellidos}</h4>
                  <p className="text-xs text-slate-500">ID: {(checkOutNino.id || "").slice(0, 8)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Persona que Retira al Niño:
                </label>
                <Select value={recogidoPorId} onValueChange={setRecogidoPorId}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                    <SelectValue placeholder="Seleccionar acudiente autorizado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {acudientesCheckOut.length === 0 ? (
                      <SelectItem value="unregistered">Acudiente no registrado en lista</SelectItem>
                    ) : (
                      acudientesCheckOut.map((a) => (
                        <SelectItem key={a.acudiente_id} value={a.acudiente_id}>
                          {(a.acudiente as any)?.nombres} {(a.acudiente as any)?.apellidos} ({a.relacion}) {a.autorizado_recoger ? "✓ Autorizado" : "⚠️ NO Autorizado"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Exige el talón de retiro físico o la confirmación vía carné digital.</span>
              </div>
            </div>
          )}

          <DialogFooter className="p-6 pt-2">
            <Button variant="ghost" onClick={() => setCheckOutDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={confirmCheckOut}
              disabled={checkOut.isPending}
              className="bg-coral hover:bg-coral/90 text-white rounded-xl px-6 font-bold"
            >
              {checkOut.isPending ? "Registrando..." : "Autorizar Salida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ÁREA DE IMPRESIÓN RÁPIDA DE STICKER (Solo visible en @media print) */}
      <div className="hidden print:block print-single-sticker-container">
        {checkedInNino && (
          <ShirtStickerComponent
            nino={checkedInNino}
            acudiente={(acudientes || []).find(a => a.nino_id === checkedInNino.id)}
            grupo={checkedInGrupo || grupoActivo}
            fecha={fechaHoyTexto}
          />
        )}
      </div>
    </div>
  );
}
