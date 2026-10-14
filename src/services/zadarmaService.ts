import CryptoJS from "crypto-js";

// Credenciales oficiales de Zadarma para Centro Mundial de Gloria
export const ZADARMA_CONFIG = {
  KEY: "c068eb681e595e132a89",
  SECRET: "3351412a4e36798a200f",
  DEFAULT_SIP: "337021-100", // Extensión PBX 100 de CMG
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
  const targetSip = sip && sip.includes("-") ? sip : ZADARMA_CONFIG.DEFAULT_SIP;
  const cacheKey = `zadarma_webrtc_cache_${targetSip}`;

  // 1. Revisar caché local para evitar consultas innecesarias
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
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
  const params = { sip: targetSip };
  const authHeader = getZadarmaAuthHeader(method, params);
  const url = `${ZADARMA_CONFIG.API_URL}${method}?format=json&sip=${encodeURIComponent(targetSip)}`;

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

let isInitializing = false;
let isInitialized = false;

/**
 * Inicializa el widget WebPhone WebRTC de Zadarma en la ventana
 */
export async function initZadarmaWebPhone(sip = ZADARMA_CONFIG.DEFAULT_SIP): Promise<boolean> {
  const w = window as any;
  if (w.zdrmWPhI || (w.zdrmWebPhone && w.zdrmWebPhone.webPhoneUA)) {
    return true;
  }
  if (isInitializing) {
    // Esperar si ya se está inicializando
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (w.zdrmWPhI || w.zdrmWebPhone) return true;
    }
  }

  isInitializing = true;

  try {
    const targetSip = sip && sip.includes("-") ? sip : ZADARMA_CONFIG.DEFAULT_SIP;

    // 1. Obtener clave WebRTC
    const key = await getZadarmaWebRTCKey(targetSip);

    // 2. Cargar librerías de Zadarma
    await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1");
    await loadScript("https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1");

    // 3. Esperar a que los scripts hijos (widget.min.js y zdrmWebrtcPhoneInterface) carguen
    let attempts = 0;
    while (!(w.zadarmaWidgetFn && (w.zdrmWebrtcPhoneInterface || w.zdrmWPhI)) && attempts < 50) {
      await new Promise((r) => setTimeout(r, 150));
      attempts++;
    }

    if (!w.zadarmaWidgetFn) {
      console.warn("Zadarma widget script no cargó a tiempo");
      isInitializing = false;
      return false;
    }

    // 4. Inicializar widget WebRTC
    w.zadarmaWidgetFn(
      key,
      targetSip,
      "rounded",
      "es",
      true,
      { right: "20px", bottom: "20px" }
    );

    // 5. Esperar a que se monte la instancia del teléfono
    for (let j = 0; j < 30; j++) {
      if (w.zdrmWPhI || w.zdrmWebPhone) {
        isInitialized = true;
        isInitializing = false;
        return true;
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    isInitializing = false;
    return Boolean(w.zdrmWPhI || w.zdrmWebPhone);
  } catch (error) {
    console.error("Error inicializando Zadarma WebPhone:", error);
    isInitializing = false;
    return false;
  }
}

/**
 * Dispara una llamada real por Zadarma WebRTC
 */
export function callViaZadarma(phoneNumber: string): boolean {
  const clean = phoneNumber.replace(/\D/g, "");
  if (!clean || clean.length < 7) return false;

  const w = window as any;

  // 1. Disparar a través de la instancia zdrmWPhI (interfaz principal de Zadarma)
  if (w.zdrmWPhI) {
    try {
      if (typeof w.zdrmWPhI.setCallingNumber === "function") {
        w.zdrmWPhI.setCallingNumber(clean);
      }
      const input = document.getElementById("zdrm-webphone-phonenumber-input") as HTMLInputElement;
      if (input) {
        input.value = clean;
      }
      if (typeof w.zdrmWPhI.callNum === "function") {
        w.zdrmWPhI.callNum();
        return true;
      }
    } catch (e) {
      console.warn("zdrmWPhI call error:", e);
    }
  }

  // 2. Disparar a través de zdrmWebPhone
  if (w.zdrmWebPhone) {
    try {
      w.zdrmWebPhone.callTo = clean;
      if (typeof w.zdrmWebPhone.call === "function") {
        w.zdrmWebPhone.call(clean);
        return true;
      }
    } catch (e) {
      console.warn("zdrmWebPhone call error:", e);
    }
  }

  // 3. Simular clic en el botón de llamar del widget si está en el DOM
  try {
    const input = document.getElementById("zdrm-webphone-phonenumber-input") as HTMLInputElement;
    if (input) {
      input.value = clean;
      const event = new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, which: 13, bubbles: true });
      input.dispatchEvent(event);
      return true;
    }
  } catch {}

  return false;
}
