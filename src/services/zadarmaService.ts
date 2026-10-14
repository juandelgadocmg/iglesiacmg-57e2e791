import CryptoJS from "crypto-js";

// Credenciales oficiales de Zadarma para Centro Mundial de Gloria
export const ZADARMA_CONFIG = {
  KEY: "c068eb681e595e132a89",
  SECRET: "3351412a4e36798a200f",
  DEFAULT_SIP: "301311", // Extensión CMG
  API_URL: "https://api.zadarma.com",
};

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
 * Obtiene la clave de WebRTC válida de Zadarma (válida por 72 horas)
 */
export async function getZadarmaWebRTCKey(sip = ZADARMA_CONFIG.DEFAULT_SIP): Promise<string> {
  // 1. Revisar caché local para evitar consultas innecesarias
  const cacheKey = `zadarma_webrtc_cache_${sip}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Válida por 48 horas (las claves expiran a las 72h)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 48 * 3600 * 1000 && parsed.key) {
        return parsed.key;
      }
    }
  } catch {}

  // 2. Revisar si el usuario guardó una clave personalizada
  const customKey = localStorage.getItem("zadarma_webrtc_key");
  if (customKey && customKey.trim().length > 20) {
    return customKey.trim();
  }

  // 3. Consultar dinámicamente a la API de Zadarma (soporta CORS)
  const method = "/v1/webrtc/get_key/";
  const params = { sip };
  const authHeader = getZadarmaAuthHeader(method, params);
  const url = `${ZADARMA_CONFIG.API_URL}${method}?format=json&sip=${encodeURIComponent(sip)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error Zadarma API (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.status !== "success" || !data.key) {
    throw new Error(`Respuesta inválida de Zadarma: ${JSON.stringify(data)}`);
  }

  // Guardar en caché
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ key: data.key, timestamp: Date.now() })
    );
  } catch {}

  return data.key;
}

/**
 * Carga un script dinámicamente si no existe
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

/**
 * Inicializa el widget WebPhone WebRTC de Zadarma en la ventana
 */
export async function initZadarmaWebPhone(sip = ZADARMA_CONFIG.DEFAULT_SIP): Promise<boolean> {
  try {
    // 1. Obtener clave WebRTC
    const key = await getZadarmaWebRTCKey(sip);

    // 2. Cargar librerías oficiales de Zadarma WebPhone
    await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1");
    await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1");

    // 3. Esperar que window.zadarmaWidgetFn esté disponible
    let attempts = 0;
    const w = window as any;
    while (!w.zadarmaWidgetFn && attempts < 35) {
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }

    if (!w.zadarmaWidgetFn) {
      console.warn("Zadarma widget script no cargó a tiempo");
      return false;
    }

    // 4. Inicializar widget WebRTC
    // params: key, sip, type, lang, isButton, position
    // Pasamos isButton: true y coordenadas discretas
    w.zadarmaWidgetFn(
      key,
      sip,
      "rounded",
      "es",
      true,
      { right: "20px", bottom: "20px" }
    );

    return true;
  } catch (error) {
    console.error("Error inicializando Zadarma WebPhone:", error);
    return false;
  }
}

/**
 * Dispara una llamada real por Zadarma WebRTC si está listo
 */
export function callViaZadarma(phoneNumber: string): boolean {
  const clean = phoneNumber.replace(/\D/g, "");
  if (!clean || clean.length < 7) return false;

  const w = window as any;
  if (w.zdrmWebPhone && typeof w.zdrmWebPhone.call === "function") {
    try {
      w.zdrmWebPhone.call(clean);
      return true;
    } catch (e) {
      console.error("Error al disparar llamada en zdrmWebPhone:", e);
    }
  }

  // Si Zadarma expone la instancia a través del widget
  if (w.zadarmaWidgetInstance && typeof w.zadarmaWidgetInstance.call === "function") {
    try {
      w.zadarmaWidgetInstance.call(clean);
      return true;
    } catch (e) {
      console.error("Error al disparar llamada en zadarmaWidgetInstance:", e);
    }
  }

  return false;
}
