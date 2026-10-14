import CryptoJS from "crypto-js";
import { supabase } from "@/integrations/supabase/client";

// Credenciales oficiales de Zadarma para Centro Mundial de Gloria
export const ZADARMA_CONFIG = {
  KEY: "c068eb681e595e132a89",
  SECRET: "3351412a4e36798a200f",
  DEFAULT_SIP: "337021-100", // Extensión PBX 100 de CMG
  PRIMARY_SIP: "301311",     // SIP principal de CMG
  DID_NUMBER: "+57 (601) 917-9246",
  API_URL: "https://api.zadarma.com",
};

export interface ZadarmaSIPCredentials {
  username: string;
  pass: string;
  domain: string;
  datacenter: string;
}

export type WebPhoneCallState =
  | "idle"
  | "connecting"
  | "registered"
  | "calling"
  | "ringing"
  | "in-call"
  | "ended"
  | "error";

/**
 * Genera el encabezado de autorización oficial de Zadarma usando HMAC-SHA1 + Base64
 */
export function getZadarmaAuthHeader(
  method: string,
  params: Record<string, string> = {}
): string {
  const p: Record<string, string> = { ...params, format: "json" };
  const sortedKeys = Object.keys(p).sort();
  const queryParts = sortedKeys.map(
    (k) => `${encodeURIComponent(k)}=${encodeURIComponent(p[k])}`
  );
  const paramsString = queryParts.join("&");

  const md5Hex = CryptoJS.MD5(paramsString).toString(CryptoJS.enc.Hex);
  const data = method + paramsString + md5Hex;
  const hmacHex = CryptoJS.HmacSHA1(data, ZADARMA_CONFIG.SECRET).toString(
    CryptoJS.enc.Hex
  );
  // Zadarma espera el base64 de la cadena hexadecimal ASCII
  const authSignature = btoa(hmacHex);

  return `${ZADARMA_CONFIG.KEY}:${authSignature}`;
}

/**
 * Llama a la API de Zadarma a través de la extensión http de Supabase
 * para evitar bloqueos de CORS o preflight OPTIONS en el navegador
 */
export async function callZadarmaViaProxy(
  method: string,
  params: Record<string, string> = {}
): Promise<any> {
  const authHeader = getZadarmaAuthHeader(method, params);
  const queryParams = new URLSearchParams();
  Object.keys(params)
    .sort()
    .forEach((k) => queryParams.append(k, params[k]));
  const queryStr = queryParams.toString().replace(/\+/g, "%20");
  const targetUrl = `${ZADARMA_CONFIG.API_URL}${method}?format=json${queryStr ? `&${queryStr}` : ""}`;

  const { data, error } = await supabase.rpc("http", {
    request: {
      method: "GET",
      uri: targetUrl,
      headers: [{ field: "Authorization", value: authHeader }],
      content_type: "application/json",
      content: null,
    },
  });

  if (error) {
    throw new Error(`Error en enlace Supabase-Zadarma: ${error.message}`);
  }

  if (!data || data.status !== 200) {
    const errorBody = data?.content || `Status ${data?.status}`;
    throw new Error(`Error Zadarma (${data?.status}): ${errorBody}`);
  }

  const parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  if (parsed.status === "error") {
    throw new Error(parsed.message || "Error en respuesta de Zadarma");
  }

  return parsed;
}

/**
 * Obtiene la clave de WebRTC válida de Zadarma (válida por 72 horas)
 */
export async function getZadarmaWebRTCKey(sip = ZADARMA_CONFIG.DEFAULT_SIP): Promise<string> {
  const targetSip = sip && sip.includes("-") ? sip : ZADARMA_CONFIG.DEFAULT_SIP;
  const cacheKey = `zadarma_webrtc_cache_${targetSip}`;

  // 1. Revisar caché local (máximo 24h para evitar claves revocadas)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 3600 * 1000 && parsed.key) {
        return parsed.key;
      }
    }
  } catch {}

  // 2. Revisar si el usuario guardó una clave personalizada
  const customKey = localStorage.getItem("zadarma_webrtc_key");
  if (customKey && customKey.trim().length > 20) {
    return customKey.trim();
  }

  // 3. Consultar dinámicamente a la API de Zadarma a través de Supabase RPC (100% libre de CORS)
  const result = await callZadarmaViaProxy("/v1/webrtc/get_key/", { sip: targetSip });
  if (!result.key) {
    throw new Error("Respuesta inválida: falta el campo 'key'");
  }

  // Guardar en caché
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ key: result.key, timestamp: Date.now() })
    );
  } catch {}

  return result.key;
}

/**
 * Obtiene las credenciales SIP dinámicas para conectar WebRTC directamente sin widget externo
 */
export async function getZadarmaSIPCredentials(sip = ZADARMA_CONFIG.DEFAULT_SIP): Promise<ZadarmaSIPCredentials> {
  const targetSip = sip && sip.includes("-") ? sip : ZADARMA_CONFIG.DEFAULT_SIP;
  const webrtcKey = await getZadarmaWebRTCKey(targetSip);

  const targetUrl = `https://api.zadarma.com/sys/webrtc/get_webphone_data.php?integrationType=site&key=${encodeURIComponent(
    webrtcKey
  )}&sipId=${encodeURIComponent(targetSip)}`;

  const { data, error } = await supabase.rpc("http", {
    request: {
      method: "GET",
      uri: targetUrl,
      headers: [],
      content_type: "application/json",
      content: null,
    },
  });

  if (error) {
    throw new Error(`Error al consultar gateway SIP: ${error.message}`);
  }

  const text = data?.content || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Respuesta inválida al consultar gateway SIP Zadarma: ${text}`);
  }

  const json = JSON.parse(text.slice(start, end + 1));
  if (json.error) {
    throw new Error(`Error de gateway Zadarma: ${JSON.stringify(json.error)}`);
  }

  return {
    username: json.username || targetSip,
    pass: json.pass,
    domain: json.domain || "pbxny1.zadarma.com",
    datacenter: json.datacenter || "ny",
  };
}

/**
 * Formatea un número de teléfono para que Zadarma lo enrute correctamente hacia Colombia
 */
export function formatZadarmaNumber(raw: string): string {
  const clean = raw.replace(/\D/g, "");
  if (!clean) return "";

  // Si ya incluye código de país Colombia (57) y tiene al menos 12 dígitos
  if (clean.startsWith("57") && clean.length >= 12) {
    return clean;
  }

  // Si es número celular colombiano de 10 dígitos (ej. 3163848499)
  if (clean.length === 10 && clean.startsWith("3")) {
    return `57${clean}`;
  }

  // Si es número fijo nacional de 10 dígitos (ej. 6019179246)
  if (clean.length === 10 && clean.startsWith("60")) {
    return `57${clean}`;
  }

  // Si es número fijo local de Bogotá (7 u 8 dígitos)
  if (clean.length === 7 || clean.length === 8) {
    return `57601${clean}`;
  }

  return clean;
}

/**
 * Carga un script dinámicamente si no existe en el documento
 */
function loadScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Error al cargar ${src}`));
    document.head.appendChild(script);
  });
}

// Variables singleton para el cliente WebRTC nativo
let jssipUA: any = null;
let currentSession: any = null;
let remoteAudioElement: HTMLAudioElement | null = null;
let isInitializingUA = false;
let currentSipCredentials: ZadarmaSIPCredentials | null = null;
let currentCallState: WebPhoneCallState = "idle";
const stateListeners: Set<(state: WebPhoneCallState) => void> = new Set();

function updateCallState(state: WebPhoneCallState) {
  currentCallState = state;
  stateListeners.forEach((fn) => {
    try {
      fn(state);
    } catch {}
  });
}

export function subscribeToCallState(fn: (state: WebPhoneCallState) => void): () => void {
  stateListeners.add(fn);
  fn(currentCallState);
  return () => {
    stateListeners.delete(fn);
  };
}

export function getCallState(): WebPhoneCallState {
  return currentCallState;
}

/**
 * Asegura el elemento de audio remoto para reproducir el tono de llamada y la voz del interlocutor
 */
function ensureRemoteAudio(): HTMLAudioElement {
  if (!remoteAudioElement || !document.body.contains(remoteAudioElement)) {
    let el = document.getElementById("doxa-remote-audio") as HTMLAudioElement;
    if (!el) {
      el = document.createElement("audio");
      el.id = "doxa-remote-audio";
      el.autoplay = true;
      (el as any).playsInline = true;
      document.body.appendChild(el);
    }
    remoteAudioElement = el;
  }
  return remoteAudioElement;
}

/**
 * Inicializa el motor SIP WebRTC de Zadarma mediante JsSIP sin scripts de widgets de terceros
 */
export async function initZadarmaEngine(sip = ZADARMA_CONFIG.DEFAULT_SIP): Promise<boolean> {
  const w = window as any;

  if (jssipUA && jssipUA.isRegistered && jssipUA.isRegistered()) {
    updateCallState("registered");
    return true;
  }

  if (isInitializingUA) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (jssipUA && jssipUA.isRegistered && jssipUA.isRegistered()) return true;
    }
  }

  isInitializingUA = true;
  updateCallState("connecting");

  try {
    // 1. Cargar JsSIP oficial provisto por Zadarma
    if (!w.JsSIP) {
      await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v8/js/jssip.min.js?v=7");
    }

    if (!w.JsSIP) {
      throw new Error("JsSIP no disponible en la ventana.");
    }

    // 2. Obtener credenciales SIP seguras (a través de Supabase RPC para bypass de CORS)
    const creds = await getZadarmaSIPCredentials(sip);
    currentSipCredentials = creds;

    // 3. Crear socket WebSocket hacia el gateway de Zadarma
    const socketUrl = `wss://${creds.domain}:4443`;
    const socket = new w.JsSIP.WebSocketInterface(socketUrl);

    // 4. Configurar User Agent SIP con todos los parámetros oficiales de Zadarma
    w.JsSIP.C.USER_AGENT = "Zadarma webRTC";

    const configuration = {
      sockets: [socket],
      uri: `sip:${creds.username}@${creds.domain}`,
      password: creds.pass,
      authorization_user: creds.username, // Requerido por Zadarma para autenticar INVITE/REGISTER
      display_name: creds.username,
      register: true,
      register_expires: 580,
      session_timers: false,
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
    };

    if (jssipUA) {
      try {
        jssipUA.stop();
      } catch {}
    }

    const ua = new w.JsSIP.UA(configuration);
    (ua as any).__zadarmaDomain = creds.domain;

    ua.on("registered", () => {
      console.log("DOXA WebPhone registrado con Zadarma WebRTC exitosamente.");
      updateCallState("registered");
    });

    ua.on("registrationFailed", (e: any) => {
      console.warn("Fallo de registro WebRTC Zadarma:", e);
      updateCallState("error");
    });

    ua.on("disconnected", () => {
      if (currentCallState !== "in-call" && currentCallState !== "calling") {
        updateCallState("idle");
      }
    });

    ua.start();
    jssipUA = ua;
    isInitializingUA = false;
    return true;
  } catch (error) {
    console.error("Error inicializando Zadarma WebRTC:", error);
    isInitializingUA = false;
    updateCallState("error");
    return false;
  }
}

/**
 * Inicia una llamada WebRTC directa desde el navegador (micrófono + altavoces del PC/celular)
 */
export async function startBrowserCall(
  rawPhone: string,
  callbacks?: {
    onRinging?: () => void;
    onConfirmed?: () => void;
    onEnded?: () => void;
    onFailed?: (cause: string) => void;
  }
): Promise<boolean> {
  const targetPhone = formatZadarmaNumber(rawPhone);
  if (!targetPhone || targetPhone.length < 7) {
    throw new Error("Ingresa un número telefónico válido (mínimo 7 dígitos)");
  }

  // 1. Asegurar motor WebRTC inicializado
  if (!jssipUA || !jssipUA.isRegistered || !jssipUA.isRegistered()) {
    const ready = await initZadarmaEngine();
    if (!ready || !jssipUA) {
      throw new Error("No se pudo conectar con el servidor telefónico de Zadarma.");
    }
  }

  // 2. Solicitar permisos de micrófono en el navegador
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Detener tracks temporales para que JsSIP cree la sesión limpia
    stream.getTracks().forEach((t) => t.stop());
  } catch (err: any) {
    throw new Error("Permiso de micrófono denegado en el navegador.");
  }

  const audio = ensureRemoteAudio();
  const domain = currentSipCredentials?.domain || (jssipUA as any).__zadarmaDomain || "pbxny1.zadarma.com";
  const targetUri = `sip:${targetPhone}@${domain}`;

  updateCallState("calling");

  const eventHandlers = {
    progress: (e: any) => {
      updateCallState("ringing");
      if (callbacks?.onRinging) callbacks.onRinging();

      if (currentSession && currentSession.connection) {
        currentSession.connection.addEventListener("track", (evt: any) => {
          if (evt.streams && evt.streams[0]) {
            audio.srcObject = evt.streams[0];
            audio.play().catch(() => {});
          }
        });
      }
    },
    confirmed: () => {
      updateCallState("in-call");
      if (callbacks?.onConfirmed) callbacks.onConfirmed();

      if (currentSession && currentSession.connection) {
        currentSession.connection.addEventListener("track", (evt: any) => {
          if (evt.streams && evt.streams[0]) {
            audio.srcObject = evt.streams[0];
            audio.play().catch(() => {});
          }
        });

        const receivers = currentSession.connection.getReceivers();
        if (receivers && receivers.length > 0) {
          const stream = new MediaStream();
          receivers.forEach((r: any) => {
            if (r.track) stream.addTrack(r.track);
          });
          audio.srcObject = stream;
          audio.play().catch(() => {});
        }
      }
    },
    ended: () => {
      currentSession = null;
      updateCallState("ended");
      if (callbacks?.onEnded) callbacks.onEnded();
      setTimeout(() => updateCallState("registered"), 1500);
    },
    failed: (e: any) => {
      const cause = e?.cause || "Llamada finalizada";
      currentSession = null;
      updateCallState("error");
      if (callbacks?.onFailed) callbacks.onFailed(cause);
      setTimeout(() => updateCallState("registered"), 2000);
    },
  };

  const callOptions = {
    eventHandlers,
    mediaConstraints: { audio: true, video: false },
    pcConfig: { rtcpMuxPolicy: "negotiate" },
    rtcOfferConstraints: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    },
  };

  try {
    currentSession = jssipUA.call(targetUri, callOptions);
    return true;
  } catch (err: any) {
    updateCallState("error");
    throw new Error(`Error al iniciar llamada: ${err.message || "desconocido"}`);
  }
}

/**
 * Finaliza la llamada WebRTC en curso
 */
export function hangupBrowserCall(): void {
  if (currentSession) {
    try {
      currentSession.terminate();
    } catch {}
    currentSession = null;
  }
  updateCallState(jssipUA && jssipUA.isRegistered && jssipUA.isRegistered() ? "registered" : "idle");
}

/**
 * Silencia o activa el micrófono en la llamada actual
 */
export function toggleMuteBrowserCall(): boolean {
  if (!currentSession) return false;
  if (currentSession.isMuted().audio) {
    currentSession.unmute({ audio: true });
    return false; // Not muted
  } else {
    currentSession.mute({ audio: true });
    return true; // Muted
  }
}

/**
 * Dispara una llamada por Callback oficial de Zadarma (Zadarma llama a tu número y te conecta con el discípulo)
 */
export async function triggerZadarmaCallback(
  toPhone: string,
  fromPhone?: string
): Promise<{ status: string; from?: string; to?: string; message?: string }> {
  const cleanTo = formatZadarmaNumber(toPhone);
  if (!cleanTo || cleanTo.length < 7) {
    throw new Error("Número de destino inválido (mínimo 7 dígitos)");
  }

  // Si no se especifica número de origen, usar el SIP principal 301311 de CMG o el número del líder
  const cleanFrom = fromPhone ? formatZadarmaNumber(fromPhone) : ZADARMA_CONFIG.PRIMARY_SIP;

  const params: Record<string, string> = {
    from: cleanFrom,
    to: cleanTo,
    sip: ZADARMA_CONFIG.PRIMARY_SIP, // SIP principal de CMG (301311)
  };

  const result = await callZadarmaViaProxy("/v1/request/callback/", params);
  return result;
}

// Aliases compatibles para código previo
export const initZadarmaWebPhone = initZadarmaEngine;

export function callViaZadarma(phoneNumber: string): boolean {
  startBrowserCall(phoneNumber).catch((err) => {
    console.error("callViaZadarma error:", err);
  });
  return true;
}
