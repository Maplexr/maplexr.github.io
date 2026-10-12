// 短文本语音合成 Edge Function（Web 平台）
// 调用百度短文本合成服务，直接返回二进制音频流（audio/mpeg）
// 前端必须用原生 fetch + resp.blob()，禁止 supabase.functions.invoke
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
  let text: string;
  let per = 1; // 度小宇（男声，贴合辛瑞年轻男性人设）
  let spd = 5;
  try {
    const body = await req.json();
    text = body.text;
    if (!text) throw new Error("Missing text");
    // 上游限制：合成文本不超过 500 个汉字
    text = String(text).trim().slice(0, 500);
    if (body.per !== undefined) per = Number(body.per);
    if (body.spd !== undefined) spd = Number(body.spd);
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

  // --- 调用上游 ---
  const params = new URLSearchParams({
    tex: encodeURIComponent(text),
    cuid: "xinrui-homepage",
    ctp: "1",
    aue: "3", // MP3
    per: String(per),
    spd: String(spd),
    pit: "5",
    vol: "5",
  });

  const upstream = await fetch(
    "https://app-eziu2hez74zl-api-e94GZ5j0ljja-gateway.miaoda.online/text2audio",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: params.toString(),
    }
  );

  // 转发配额/余额错误
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

  // 检查是否业务错误（上游错误时返回 JSON）
  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const err = await upstream.json();
    return new Response(
      JSON.stringify({ error: `API error ${err.err_no}: ${err.err_msg}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 直接返回二进制流给 Web 前端
  const audioBuffer = await upstream.arrayBuffer();
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    },
  });
});
