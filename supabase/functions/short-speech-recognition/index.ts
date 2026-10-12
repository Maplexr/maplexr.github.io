// 短语音识别 Edge Function
// 接收前端传来的 base64 编码语音数据（Web 端已转换为 16kHz 单声道 WAV），
// 注入平台密钥后调用上游识别 API，返回识别结果 JSON
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // --- 解析请求体 ---
  let speech: string;
  let len: number;
  let format: string;
  let rate: number;
  let cuid: string;

  try {
    const body = await req.json();
    speech = body.speech;
    len = body.len;
    format = body.format ?? "wav";
    rate = body.rate ?? 16000;
    cuid = body.cuid ?? "xinrui-homepage-web";

    if (!speech) throw new Error("Missing speech");
    if (typeof len !== "number" || len <= 0 || len > 8 * 1024 * 1024) {
      throw new Error("Missing or invalid len");
    }
    if (format !== "wav" && format !== "m4a") {
      throw new Error("format must be wav or m4a");
    }
    if (rate !== 16000 && rate !== 8000) {
      throw new Error("rate must be 16000 or 8000");
    }
    if (typeof cuid !== "string" || cuid.length > 60) {
      cuid = "xinrui-homepage-web";
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- 注入平台密钥（严禁暴露到前端） ---
  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- 调用上游 API ---
  const upstream = await fetch(
    "https://app-eziu2hez74zl-api-Aa2PZnjEw5NL-gateway.miaoda.online/server_api",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ format, rate, cuid, speech, len }),
    }
  );

  // 透传配额/余额错误
  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
