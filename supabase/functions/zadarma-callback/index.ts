import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import crypto from "node:crypto";

const ZADARMA_KEY = Deno.env.get("ZADARMA_KEY") || "c068eb681e595e132a89";
const ZADARMA_SECRET = Deno.env.get("ZADARMA_SECRET") || "3351412a4e36798a200f";
// Default SIP extension for CMG
const DEFAULT_FROM = "301311";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { to, from, action, sip } = body;

    // --- WebRTC Key Generation ---
    if (action === 'get_webrtc_key') {
      if (!sip) throw new Error("Missing 'sip' parameter");
      
      const method = "/v1/webrtc/get_key/";
      const params: Record<string, string> = { sip };

      const sortedKeys = Object.keys(params).sort();
      const queryParams = new URLSearchParams();
      sortedKeys.forEach(k => queryParams.append(k, params[k]));
      let queryStr = queryParams.toString().replace(/\+/g, '%20');

      const md5 = crypto.createHash("md5").update(queryStr).digest("hex");
      const dataToSign = method + queryStr + md5;
      const signature = crypto.createHmac("sha1", ZADARMA_SECRET).update(dataToSign).digest("base64");

      const response = await fetch(`https://api.zadarma.com${method}?${queryStr}`, {
        method: "GET",
        headers: { "Authorization": `${ZADARMA_KEY}:${signature}` }
      });

      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(`Zadarma API Error: ${JSON.stringify(result)}`);
      }

      return new Response(
        JSON.stringify({ success: true, key: result.key }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // --- Standard Callback ---
    if (!to) {
      throw new Error("Missing 'to' parameter (destination phone number)");
    }

    const callerId = from || DEFAULT_FROM;
    
    // Preparar parámetros para la API de Zadarma
    const method = "/v1/request/callback/";
    const params: Record<string, string> = { 
      from: callerId, 
      to: to.replace(/\D/g, '') // Asegurar que sea numérico
    };

    // Firmar la petición (Zadarma API reqs)
    const sortedKeys = Object.keys(params).sort();
    const queryParams = new URLSearchParams();
    sortedKeys.forEach(k => queryParams.append(k, params[k]));
    
    // Zadarma requiere ordenar los parámetros y usar url-encoding, pero los espacios como %20 no +. URLSearchParams usa + por defecto, lo ajustamos:
    let queryStr = queryParams.toString().replace(/\+/g, '%20');

    // MD5 de los parámetros
    const md5 = crypto.createHash("md5").update(queryStr).digest("hex");
    
    // Cadena a firmar
    const dataToSign = method + queryStr + md5;
    
    // HMAC-SHA1 en Base64
    const signature = crypto.createHmac("sha1", ZADARMA_SECRET).update(dataToSign).digest("base64");

    // Realizar la petición a Zadarma
    const response = await fetch(`https://api.zadarma.com${method}?${queryStr}`, {
      method: "GET", // Callback API docs usually indicate GET is fine or we can POST
      headers: {
        "Authorization": `${ZADARMA_KEY}:${signature}`
      }
    });

    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      throw new Error(`Zadarma Error: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Llamada en progreso", data: result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Callback Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
