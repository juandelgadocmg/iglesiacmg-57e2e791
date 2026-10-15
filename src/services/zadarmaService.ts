import CryptoJS from "crypto-js";
import { supabase } from "@/integrations/supabase/client";

// Credenciales oficiales de Zadarma para Centro Mundial de Gloria
export const ZADARMA_CONFIG = {
  KEY: "c068eb681e595e132a89",
  SECRET: "3351412a4e36798a200f",
  DEFAULT_SIP: "301311", // Cuenta SIP principal con saldo activo ($16.73 USD) y DID Bogotá
  PRIMARY_SIP: "301311", // SIP principal de CMG
  PBX_EXTENSION: "337021-100",
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
export async function getZadarmaWebRTCKey(sip = ZADARMA_CONFIG.PRIMARY_SIP): Promise<string> {
  const targetSip = ZADARMA_CONFIG.PRIMARY_SIP;
  const cacheKey = `zadarma_webrtc_cache_v5_${targetSip}`;

  // 1. Revisar caché local (máximo 10 minutos para asegurar frescura total)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 10 * 60 * 1000 && parsed.key) {
        return parsed.key;
      }
    }
  } catch {}

  // 2. Consultar dinámicamente a la API de Zadarma a través de Supabase RPC (100% libre de CORS)
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
 * Obtiene credenciales SIP efímeras y frescas para cada llamada WebRTC
 * IMPORTANTE: Zadarma exige que esta consulta se haga por JSONP desde el navegador del usuario
 * para vincular la IP del cliente a la contraseña SIP en Asterisk.
 */
export async function getZadarmaSIPCredentials(sip = ZADARMA_CONFIG.PRIMARY_SIP): Promise<ZadarmaSIPCredentials> {
  const targetSip = ZADARMA_CONFIG.PRIMARY_SIP;
  const webrtcKey = await getZadarmaWebRTCKey(targetSip);

  return new Promise<ZadarmaSIPCredentials>((resolve, reject) => {
    const callbackName = `zdrm_jsonp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");

    const cleanup = () => {
      try {
        delete (window as any)[callbackName];
      } catch {}
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      clearTimeout(timer);
    };

    (window as any)[callbackName] = (response: any) => {
      cleanup();
      if (!response) {
        reject(new Error("Respuesta vacía del servidor telefónico de Zadarma"));
        return;
      }
      if (response.error) {
        reject(new Error(response.error.content || "Error en credenciales Zadarma"));
        return;
      }
      if (!response.pass) {
        reject(new Error("Zadarma no devolvió contraseña SIP válida"));
        return;
      }
      resolve({
        username: response.username || targetSip,
        pass: response.pass,
        domain: response.domain || "sipny1.zadarma.com",
        datacenter: response.datacenter || "ny",
      });
    };

    script.src = `https://api.zadarma.com/sys/webrtc/get_webphone_data.php?integrationType=site&jsonpCallback=${callbackName}&key=${encodeURIComponent(
      webrtcKey
    )}&sipId=${encodeURIComponent(targetSip)}`;

    script.onerror = () => {
      cleanup();
      reject(new Error("No se pudo cargar el gateway telefónico de Zadarma"));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Tiempo de espera agotado al obtener credenciales SIP de Zadarma"));
    }, 10000);

    document.head.appendChild(script);
  });
}

/**
 * Formatea un número de teléfono para que Zadarma lo enrute correctamente en llamadas WebRTC JsSIP.
 * Asterisk PBX de Zadarma exige estándar E.164 con el signo '+' para llamadas a números externos
 * (ej: +573163848499). Sin el '+', Asterisk lo interpreta como una extensión interna PBX inexistente (404 Not Found).
 */
export function formatZadarmaNumber(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  // 1. Si es extensión interna corta de la PBX (3 o 4 dígitos, ej. 100, 101, etc.)
  if (digits.length <= 4) {
    return digits;
  }

  // 2. Si empieza por '00' (prefijo internacional común), remover 00 y anteponer '+'
  if (digits.startsWith("00")) {
    return `+${digits.substring(2)}`;
  }

  // 3. Si ya incluye código de país Colombia '57' y tiene al menos 12 dígitos (ej. 573163848499 o 576019179246)
  if (digits.startsWith("57") && digits.length >= 12) {
    return `+${digits}`;
  }

  // 4. Si es número celular colombiano de 10 dígitos (ej. 3163848499)
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+57${digits}`;
  }

  // 5. Si es número fijo nacional de 10 dígitos con indicativo (ej. 6019179246)
  if (digits.length === 10 && digits.startsWith("60")) {
    return `+57${digits}`;
  }

  // 6. Si es número fijo local de Bogotá (7 u 8 dígitos, ej. 9179246)
  if (digits.length === 7 || digits.length === 8) {
    return `+57601${digits}`;
  }

  // 7. Si es cualquier otro número nacional colombiano de 10 dígitos
  if (digits.length === 10) {
    return `+57${digits}`;
  }

  // 8. Si originalmente venía con '+'
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  // 9. Cualquier otro número internacional externo
  return `+${digits}`;
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
 * Inicializa previamente la librería JsSIP en la ventana
 */
export async function initZadarmaEngine(): Promise<boolean> {
  const w = window as any;
  try {
    if (!w.JsSIP) {
      await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v8/js/jssip.min.js?v=7");
    }
    updateCallState("registered");
    return true;
  } catch {
    updateCallState("error");
    return false;
  }
}

/**
 * Inicia una llamada WebRTC directa desde el navegador (micrófono + altavoces del PC/celular)
 * Crea una sesión SIP fresca y autenticada en el momento exacto de llamar
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

  updateCallState("connecting");

  // 1. Solicitar permisos de micrófono en el navegador
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch (err: any) {
    updateCallState("error");
    throw new Error("Permiso de micrófono denegado en el navegador.");
  }

  const w = window as any;
  if (!w.JsSIP) {
    await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v8/js/jssip.min.js?v=7");
  }

  // 2. Obtener credenciales SIP EFÍMERAS inmediatamente antes de cursar la llamada
  const creds = await getZadarmaSIPCredentials(ZADARMA_CONFIG.PRIMARY_SIP);

  // 3. Detener sesión previa si existía
  if (jssipUA) {
    try {
      jssipUA.stop();
    } catch {}
    jssipUA = null;
  }

  // 4. Conectar WebSocket directo al servidor SIP de Zadarma
  const socketUrl = `wss://${creds.domain}:4443`;
  const socket = new w.JsSIP.WebSocketInterface(socketUrl);

  w.JsSIP.C.USER_AGENT = "Zadarma webRTC";

  const configuration = {
    sockets: [socket],
    uri: `sip:${creds.username}@${creds.domain}`,
    password: creds.pass,
    authorization_user: creds.username,
    user_agent: "Zadarma webRTC",
    display_name: creds.username,
    register: true,
    register_expires: 580,
    session_timers: false,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
  };

  const ua = new w.JsSIP.UA(configuration);
  jssipUA = ua;

  const audio = ensureRemoteAudio();
  const targetUri = `sip:${targetPhone}@${creds.domain}`;

  return new Promise<boolean>((resolve, reject) => {
    let callDispatched = false;

    const executeCall = () => {
      if (callDispatched) return;
      callDispatched = true;
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
          let cause = e?.cause || "Llamada finalizada";
          if (cause === "Not Found") {
            cause = "Número no encontrado o fuera de servicio";
          } else if (cause === "Busy") {
            cause = "Línea ocupada";
          } else if (cause === "Rejected") {
            cause = "Llamada rechazada";
          } else if (cause === "Unavailable") {
            cause = "Usuario no disponible o sin señal";
          } else if (cause === "User Denied Media Access") {
            cause = "Permiso de micrófono denegado";
          }
          currentSession = null;
          updateCallState("error");
          if (callbacks?.onFailed) callbacks.onFailed(cause);
          setTimeout(() => updateCallState("registered"), 2000);
        },
      };

      const callOptions = {
        eventHandlers,
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [
            { urls: ["stun:stun.zadarma.com:3478", "stun:stun.l.google.com:19302"] }
          ],
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        },
      };

      try {
        currentSession = ua.call(targetUri, callOptions);

        if (currentSession) {
          currentSession.on("peerconnection", (data: any) => {
            const pc = data?.peerconnection;
            if (pc) {
              pc.addEventListener("track", (evt: any) => {
                if (evt.streams && evt.streams[0]) {
                  audio.srcObject = evt.streams[0];
                  audio.play().catch(() => {});
                }
              });
            }
          });
        }

        resolve(true);
      } catch (err: any) {
        updateCallState("error");
        reject(err);
      }
    };

    ua.on("registered", () => {
      console.log("DOXA: Registrado con Zadarma WebRTC. Iniciando llamada...");
      clearTimeout(regTimeout);
      executeCall();
    });

    if (ua.isRegistered && ua.isRegistered()) {
      clearTimeout(regTimeout);
      executeCall();
    }

    ua.on("registrationFailed", (e: any) => {
      console.warn("DOXA: Fallo de registro SIP:", e);
      try {
        localStorage.removeItem(`zadarma_webrtc_cache_v5_${ZADARMA_CONFIG.PRIMARY_SIP}`);
      } catch {}
      clearTimeout(regTimeout);
      updateCallState("error");
      const reason = e?.cause || e?.response?.reason_phrase || "Error de autenticación con el servidor telefónico";
      reject(new Error(`Fallo de conexión telefónica: ${reason}`));
    });

    ua.on("disconnected", (e: any) => {
      if (!callDispatched) {
        console.warn("DOXA: Desconectado del WebSocket de Zadarma:", e);
      }
    });

    const regTimeout = setTimeout(() => {
      if (!callDispatched) {
        console.warn("DOXA: Tiempo de espera agotado esperando registro SIP");
        updateCallState("error");
        try {
          ua.stop();
        } catch {}
        reject(new Error("Tiempo de espera agotado al conectar con el servidor telefónico de Zadarma"));
      }
    }, 12000);

    ua.start();
  });
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
  updateCallState("registered");
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
  // Para la API REST de callback de Zadarma, se envían únicamente dígitos sin '+'
  const cleanTo = formatZadarmaNumber(toPhone).replace(/^\+/, "");
  if (!cleanTo || cleanTo.length < 7) {
    throw new Error("Número de destino inválido (mínimo 7 dígitos)");
  }

  // Si no se especifica número de origen, usar el SIP principal 301311 de CMG o el número del líder
  const cleanFrom = fromPhone ? formatZadarmaNumber(fromPhone).replace(/^\+/, "") : ZADARMA_CONFIG.PRIMARY_SIP;

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
