import { useState, useMemo } from "react";
import {
  Bell,
  Send,
  AlertTriangle,
  MessageSquare,
  History,
  Phone,
  ShieldAlert,
  ExternalLink,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useInfantilNotificaciones,
  useCreateInfantilNotificacion,
  useInfantilGrupos,
  useInfantilAcudientes,
  useInfantilAsistencias,
} from "@/hooks/useInfantil";
import { useNinos } from "../hooks/useNinos";

const TIPO_LABELS: Record<string, string> = {
  emergencia: "Emergencia / Urgencia",
  recogida: "Solicitud de Recogida",
  informativo: "Informativo / Recordatorio",
};

function formatWhatsAppPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  return digits;
}

export default function NotificacionesInfantilView() {
  const fechaHoy = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: historial = [], isLoading } = useInfantilNotificaciones();
  const createNotificacion = useCreateInfantilNotificacion();
  const { data: grupos = [] } = useInfantilGrupos();
  const { data: acudientesRel = [] } = useInfantilAcudientes();
  const { data: asistenciasHoy = [] } = useInfantilAsistencias(fechaHoy);
  const { ninos = [] } = useNinos();

  const [tipo, setTipo] = useState("emergencia");
  const [canal, setCanal] = useState("WhatsApp");
  const [modoDestinatario, setModoDestinatario] = useState("todos_hoy");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("");
  const [ninoSeleccionado, setNinoSeleccionado] = useState<string>("");
  const [asuntoPersonalizado, setAsuntoPersonalizado] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [colaWhatsApp, setColaWhatsApp] = useState<
    Array<{ nombre: string; nino: string; telefono: string; url: string }>
  >([]);

  // Mapa rápido de niño -> acudiente principal (con teléfono y correo)
  const acudientePorNino = useMemo(() => {
    const map = new Map<
      string,
      {
        acudiente_id: string | null;
        acudiente_nombre: string;
        telefono: string | null;
        email: string | null;
      }
    >();

    for (const rel of acudientesRel as any[]) {
      if (!rel?.nino_id || !rel?.acudiente) continue;
      const ac = rel.acudiente;
      const current = map.get(rel.nino_id);
      if (!current || rel.es_principal) {
        map.set(rel.nino_id, {
          acudiente_id: ac.id || rel.acudiente_id || null,
          acudiente_nombre: `${ac.nombres || ""} ${ac.apellidos || ""}`.trim() || "Acudiente",
          telefono: ac.whatsapp || ac.telefono || null,
          email: ac.email || null,
        });
      }
    }

    for (const n of ninos as any[]) {
      if (map.has(n.id)) continue;
      const det = Array.isArray(n.infantil_detalles) ? n.infantil_detalles[0] : n.infantil_detalles;
      if (det?.acudiente_nombre || det?.acudiente_telefono || n.telefono || n.whatsapp || n.email) {
        map.set(n.id, {
          acudiente_id: null,
          acudiente_nombre: det?.acudiente_nombre || `Acudiente de ${n.nombres}`,
          telefono: det?.acudiente_telefono || n.whatsapp || n.telefono || null,
          email: n.email || null,
        });
      }
    }

    return map;
  }, [acudientesRel, ninos]);

  // Resolver lista real de destinatarios según el filtro elegido
  const destinatariosResueltos = useMemo(() => {
    const list: Array<{
      nino_id: string;
      nino_nombre: string;
      acudiente_id?: string | null;
      acudiente_nombre?: string | null;
      telefono?: string | null;
      email?: string | null;
      grupo_id?: string | null;
    }> = [];
    const seenNinos = new Set<string>();

    const addNino = (ninoObj: any, grupoId?: string | null) => {
      if (!ninoObj?.id || seenNinos.has(ninoObj.id)) return;
      seenNinos.add(ninoObj.id);
      const ac = acudientePorNino.get(ninoObj.id);
      const ninoNombre = `${ninoObj.nombres || ""} ${ninoObj.apellidos || ""}`.trim() || "Niño";
      list.push({
        nino_id: ninoObj.id,
        nino_nombre: ninoNombre,
        acudiente_id: ac?.acudiente_id || null,
        acudiente_nombre: ac?.acudiente_nombre || `Acudiente de ${ninoNombre}`,
        telefono: ac?.telefono || ninoObj.whatsapp || ninoObj.telefono || null,
        email: ac?.email || ninoObj.email || null,
        grupo_id: grupoId || null,
      });
    };

    if (modoDestinatario === "individual") {
      const found = (ninos as any[]).find((n) => n.id === ninoSeleccionado);
      if (found) addNino(found, null);
      return list;
    }

    if (modoDestinatario === "grupo") {
      if (!grupoSeleccionado) return list;
      for (const a of asistenciasHoy as any[]) {
        if (a.grupo_id === grupoSeleccionado && a.nino) {
          addNino(a.nino, a.grupo_id);
        }
      }
      if (list.length === 0) {
        for (const n of ninos as any[]) {
          addNino(n, grupoSeleccionado);
        }
      }
      return list;
    }

    for (const a of asistenciasHoy as any[]) {
      if (a.nino) addNino(a.nino, a.grupo_id);
    }
    if (list.length === 0) {
      for (const n of ninos as any[]) {
        addNino(n, null);
      }
    }

    return list;
  }, [modoDestinatario, ninoSeleccionado, grupoSeleccionado, asistenciasHoy, ninos, acudientePorNino]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      return toast.error("El mensaje no puede estar vacío");
    }
    if (destinatariosResueltos.length === 0) {
      return toast.error("Selecciona al menos un niño o acudiente destinatario");
    }

    const asuntoFinal = asuntoPersonalizado.trim() || TIPO_LABELS[tipo] || "Notificación Infantil";

    try {
      const result = await createNotificacion.mutateAsync({
        destinatarios: destinatariosResueltos,
        tipo: tipo === "emergencia" ? "urgente" : tipo,
        asunto: asuntoFinal,
        mensaje: mensaje.trim(),
        canal,
      });

      const waLinks: Array<{ nombre: string; nino: string; telefono: string; url: string }> = [];
      for (const d of destinatariosResueltos) {
        const cleanPhone = formatWhatsAppPhone(d.telefono);
        if (cleanPhone) {
          const textoWa = `*Iglesia Infantil — ${asuntoFinal}*\nHola ${d.acudiente_nombre || "Acudiente"} (acudiente de *${d.nino_nombre}*):\n\n${mensaje.trim()}`;
          waLinks.push({
            nombre: d.acudiente_nombre || "Acudiente",
            nino: d.nino_nombre,
            telefono: d.telefono || cleanPhone,
            url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textoWa)}`,
          });
        }
      }

      setColaWhatsApp(waLinks);

      if ((canal === "WhatsApp" || canal === "Ambos") && waLinks.length === 1) {
        window.open(waLinks[0].url, "_blank", "noopener,noreferrer");
      }

      const detalleEnvio = [
        `${result.createdItems.length} notificación(es) registrada(s)`,
        result.emailsEncolados > 0 ? `${result.emailsEncolados} correo(s) enviado(s)` : null,
        waLinks.length > 0 ? `${waLinks.length} contacto(s) de WhatsApp listos` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      toast.success(`Notificación enviada: ${detalleEnvio}`);
      setMensaje("");
      setAsuntoPersonalizado("");
    } catch (err: any) {
      toast.error("Error al enviar la notificación: " + (err?.message || "Error inesperado"));
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Centro de Notificaciones
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Comunicación directa, trazable e inmediata con padres y acudientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden h-fit">
          <div className="h-2 w-full bg-gradient-to-r from-coral to-red-500" />
          <CardHeader>
            <CardTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Send className="w-5 h-5 text-coral" />
              Nueva Notificación a Padres
            </CardTitle>
            <CardDescription>
              Envía una alerta urgente de recogida, correo o mensaje por WhatsApp a los acudientes reales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Tipo de Notificación</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergencia">
                        <div className="flex items-center text-red-600 font-bold">
                          <AlertTriangle className="w-4 h-4 mr-2" /> Emergencia / Urgencia
                        </div>
                      </SelectItem>
                      <SelectItem value="recogida">
                        <div className="flex items-center text-emerald-600 font-bold">
                          <ShieldAlert className="w-4 h-4 mr-2" /> Solicitud de Recogida
                        </div>
                      </SelectItem>
                      <SelectItem value="informativo">
                        <div className="flex items-center text-blue-600 font-bold">
                          <MessageSquare className="w-4 h-4 mr-2" /> Informativo / Recordatorio
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Canal de Envío</Label>
                  <Select value={canal} onValueChange={setCanal}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WhatsApp">WhatsApp Directo + Registro</SelectItem>
                      <SelectItem value="Correo">Correo Electrónico + Registro</SelectItem>
                      <SelectItem value="Ambos">Ambos (WhatsApp + Correo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Destinatario</Label>
                <Select value={modoDestinatario} onValueChange={setModoDestinatario}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos_hoy">
                      Todos los padres activos ({asistenciasHoy.length > 0 ? `${asistenciasHoy.length} en sala hoy` : `${ninos.length} registrados`})
                    </SelectItem>
                    <SelectItem value="grupo">Padres de un grupo infantil específico</SelectItem>
                    <SelectItem value="individual">Seleccionar un niño / acudiente en específico...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modoDestinatario === "grupo" && (
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Seleccionar Grupo Infantil</Label>
                  <Select value={grupoSeleccionado} onValueChange={setGrupoSeleccionado}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                      <SelectValue placeholder="Elige un grupo infantil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nombre} {g.edades ? `(${g.edades})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {modoDestinatario === "individual" && (
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Seleccionar Niño / Acudiente</Label>
                  <Select value={ninoSeleccionado} onValueChange={setNinoSeleccionado}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                      <SelectValue placeholder="Elige el niño a notificar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(ninos as any[]).map((n) => {
                        const ac = acudientePorNino.get(n.id);
                        return (
                          <SelectItem key={n.id} value={n.id}>
                            {n.nombres} {n.apellidos}
                            {ac?.acudiente_nombre ? ` — Acudiente: ${ac.acudiente_nombre}` : ""}
                            {ac?.telefono ? ` (${ac.telefono})` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-2xl bg-slate-100/80 border border-slate-200/80 p-3.5 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Destinatarios detectados: {destinatariosResueltos.length}
                  </span>
                  <span>
                    {destinatariosResueltos.filter((d) => d.telefono).length} con Teléfono ·{" "}
                    {destinatariosResueltos.filter((d) => d.email).length} con Email
                  </span>
                </div>
                {destinatariosResueltos.length === 1 && (
                  <p className="text-slate-500">
                    Contacto: <strong>{destinatariosResueltos[0].acudiente_nombre}</strong> (
                    {destinatariosResueltos[0].telefono || "Sin teléfono"} /{" "}
                    {destinatariosResueltos[0].email || "Sin correo"})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Asunto (opcional)</Label>
                <Input
                  value={asuntoPersonalizado}
                  onChange={(e) => setAsuntoPersonalizado(e.target.value)}
                  placeholder={TIPO_LABELS[tipo] || "Aviso de Iglesia Infantil"}
                  className="h-11 rounded-xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Mensaje para el Padre / Acudiente</Label>
                <Textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Ej: Por favor acérquese al salón de Iglesia Infantil para recoger a su hijo(a)..."
                  className="min-h-[120px] rounded-xl bg-slate-50 resize-none"
                />
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMensaje(
                          "Por favor acérquese de inmediato al salón de Iglesia Infantil para recoger a su hijo(a)."
                        )
                      }
                      className="text-blue-600 hover:underline font-medium"
                    >
                      + Plantilla Recogida
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setMensaje(
                          "La clase de Iglesia Infantil ha finalizado. Ya puede acercarse a recoger a su hijo(a) con su código de seguridad."
                        )
                      }
                      className="text-blue-600 hover:underline font-medium"
                    >
                      + Plantilla Salida
                    </button>
                  </div>
                  <span>{mensaje.length} caracteres</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={createNotificacion.isPending}
                className={`w-full h-12 rounded-xl text-white font-bold shadow-lg transition-all ${
                  tipo === "emergencia"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    : "bg-navy hover:bg-navy/90 shadow-navy/20"
                }`}
              >
                {createNotificacion.isPending ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />{" "}
                    Enviando notificación...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="w-4 h-4 mr-2" /> Enviar Notificación Ahora ({destinatariosResueltos.length})
                  </span>
                )}
              </Button>
            </form>

            {colaWhatsApp.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    Envío directo por WhatsApp ({colaWhatsApp.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setColaWhatsApp([])}
                    className="h-7 text-xs text-slate-400"
                  >
                    Limpiar
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {colaWhatsApp.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {item.nombre} <span className="font-normal text-slate-500">({item.nino})</span>
                        </p>
                        <p className="text-slate-500">{item.telefono}</p>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                      >
                        Abrir WhatsApp <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-slate-50/50">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              Historial Reciente de Notificaciones ({historial.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Cargando historial...</div>
              ) : historial.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                  <p>No hay notificaciones enviadas recientemente.</p>
                </div>
              ) : (
                historial.map((notif: any) => {
                  const isUrgent =
                    notif.tipo?.toLowerCase().includes("emergencia") ||
                    notif.tipo?.toLowerCase().includes("urgente");
                  const ninoNombre = notif.nino
                    ? `${notif.nino.nombres || ""} ${notif.nino.apellidos || ""}`.trim()
                    : "";
                  const acudienteNombre =
                    notif.destinatario_nombre ||
                    (notif.acudiente
                      ? `${notif.acudiente.nombres || ""} ${notif.acudiente.apellidos || ""}`.trim()
                      : "");
                  const waPhone = formatWhatsAppPhone(
                    notif.destinatario_telefono || notif.acudiente?.telefono
                  );

                  return (
                    <div
                      key={notif.id}
                      className="p-4 hover:bg-white transition-colors flex gap-4 items-start justify-between"
                    >
                      <div className="flex gap-3.5 items-start">
                        <div
                          className={`p-2 rounded-full mt-1 shrink-0 ${
                            isUrgent
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {isUrgent ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-700">
                              {notif.asunto || notif.tipo || "Notificación"}
                            </span>
                            {ninoNombre && (
                              <Badge variant="secondary" className="text-[10px]">
                                Niño: {ninoNombre}
                              </Badge>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {notif.created_at
                                ? new Date(notif.created_at).toLocaleString()
                                : ""}
                            </span>
                          </div>
                          {acudienteNombre && (
                            <p className="text-xs font-semibold text-slate-500 mb-1">
                              Para: {acudienteNombre}
                            </p>
                          )}
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {notif.mensaje}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-white border-slate-200 text-slate-500"
                            >
                              {notif.canal || "WhatsApp"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 border-emerald-200 text-emerald-600"
                            >
                              {notif.estado || "Enviado"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(notif.mensaje || "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200"
                          title="Reenviar por WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
