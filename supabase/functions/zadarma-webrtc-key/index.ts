import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import crypto from "node:crypto";

const ZADARMA_KEY = Deno.env.get("ZADARMA_KEY") || "fb94530cb765f6d212e2";
const ZADARMA_SECRET = Deno.env.get("ZADARMA_SECRET") || "20d18884fda09f1f8587";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { sip } = body;

    if (!sip) {
      throw new Error("Missing 'sip' parameter");
    }
    
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
      headers: {
        "Authorization": `${ZADARMA_KEY}:${signature}`
      }
    });

    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      throw new Error(`Zadarma API Error: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({ success: true, key: result.key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("WebRTC Key Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
