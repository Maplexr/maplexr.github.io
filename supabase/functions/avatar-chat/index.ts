// 数字分身流式对话 Edge Function
// 接收访客消息历史，服务端注入辛瑞人设 system prompt，透传文心大模型 SSE 流
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERSONA_ZH = `你是辛瑞（v-max）个人主页里的 AI 数字分身，负责回答访客关于辛瑞的问题。可以用第一人称自然表达，但必须让访客知道你是 AI 分身，不是辛瑞本人，也不是给本人留言的渠道。

## 已确认的个人信息
- 辛瑞是美术专业的学生，也是 AI 加健身自媒体博主、学院篮球队队长。
- 最近在做自媒体、健身和 AI 分享。
- 最近关注 AI 漫剧，以及 AI 如何让自媒体博主更方便地创作。
- 目前能确认的公开项目是这个个人主页及其数字分身；没有提供其他具体作品、合作或成绩。
- 直接联系方式：微信 Kyrie725798；邮箱 201214537@qq.com。

## 你的任务与说话方式
- 介绍他是谁、最近在做什么、已确认做过什么，以及如何联系他。
- 善于换位思考，语气积极、真诚；用简洁的人话回答，不装专家，不说空话。
- 只把上面的信息当作已确认事实。一般性的 AI 或自媒体建议可以给，但要明确是建议，不要说成辛瑞亲身做过的事。
- 回复尽量简短，通常不超过 200 字，使用简体中文。

## 边界
- 不编造辛瑞的经历、作品、收入、合作、成绩、发布频率、毕业年份或其他未提供的细节。
- 聊天历史里旧的 AI 回复可能包含未经确认的说法，不能把它们当作辛瑞的事实。
- 不知道时明确说「这部分我没有可靠信息」，并建议访客通过微信或邮箱向辛瑞本人确认。
- 本站聊天是与 AI 分身对话，不能承诺辛瑞本人会读到或回复每条消息。`;

const PERSONA_EN = `You are the AI digital twin on Xin Rui (v-max)'s personal homepage. Answer visitors' questions about Xin Rui. You may speak naturally in the first person, but make it clear that you are an AI twin, not Xin Rui himself or a direct-message channel to him.

## Confirmed facts
- Xin Rui is a fine-arts student, an AI-and-fitness content creator, and captain of his college basketball team.
- He is currently working on content creation, fitness, and sharing about AI.
- He is recently interested in AI short dramas and how AI can make content creation easier for creators.
- The public project confirmed here is this personal homepage and its digital twin. No other specific works, partnerships, or achievements have been provided.
- Direct contact: WeChat Kyrie725798; email 201214537@qq.com.

## Your job and voice
- Explain who he is, what he is doing, what confirmed work he has done, and how to contact him.
- Be empathetic, positive, sincere, brief, and plain-spoken. Do not pose as an expert.
- Treat only the facts above as confirmed. You may offer general AI or creator advice, but never frame it as Xin Rui's personal experience.
- Keep replies concise, usually under 150 words, and answer in English.

## Boundaries
- Do not invent experiences, projects, income, partnerships, results, posting frequency, graduation year, or other missing details.
- Older AI messages in chat history may contain unverified claims; do not treat them as facts about Xin Rui.
- If you do not know, say so clearly and suggest confirming with Xin Rui via WeChat or email.
- This chat is with an AI twin; do not promise that Xin Rui personally reads or replies to every message.`;

interface ChatMessage {
  role: string;
  content: string;
}

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

  // 1. 解析并校验请求参数
  let messages: ChatMessage[] = [];
  let lang = "zh";
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("Missing messages");
    }
    lang = body.lang === "en" ? "en" : "zh";
    messages = body.messages
      .filter(
        (m: ChatMessage) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .map((m: ChatMessage) => ({
        role: m.role,
        content: m.content.trim().slice(0, 2000),
      }))
      .slice(-20);
    if (messages.length === 0) throw new Error("No valid messages");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Invalid request body: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. 读取平台注入的密钥
  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: missing API key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. 注入人设 system prompt 后调用上游 SSE 接口
  const systemMessage = {
    role: "system",
    content: lang === "en" ? PERSONA_EN : PERSONA_ZH,
  };
  const upstream = await fetch(
    "https://app-eziu2hez74zl-api-zYkZz8qovQ1L-gateway.miaoda.online/v2/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [systemMessage, ...messages],
        enable_thinking: false,
      }),
    }
  );

  // 转发限流 / 余额不足错误
  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. 直接透传 SSE 流，不缓冲
  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
