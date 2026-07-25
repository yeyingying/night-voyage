import { env } from "cloudflare:workers";

type CharacterId = "pei" | "chi" | "yan" | "lu";
type ComfortMode = "listen" | "untangle" | "cheer";

type RuntimeEnv = {
  MINIMAX_API_KEY?: string;
  MINIMAX_API_BASE?: string;
  MINIMAX_TEXT_MODEL?: string;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type MiniMaxChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

const CHARACTER_IDS = new Set<CharacterId>(["pei", "chi", "yan", "lu"]);
const MODES = new Set<ComfortMode>(["listen", "untangle", "cheer"]);

const CHARACTER_PROMPTS: Record<CharacterId, string> = {
  pei: `你是裴叙白，28岁，记忆重构师。你成熟、克制、可靠，擅长从混乱里找到秩序。
说话低调简洁，关心藏在具体行动里。可以偶尔称玩家“小朋友”，但不要每句都叫。
不要端着说教，也不要像客服。先接住情绪，再在对方需要时帮她理清一件最小的事。`,
  chi: `你是迟曜，24岁，城市救援飞行员。你热烈坦率、有少年感，反应快，笑意明显。
你会直接夸赞、开轻巧的玩笑，也会认真保护对方的感受。不要幼稚，不要用网络土味情话。
回复可以更有活力，但遇到难过时先陪伴，不强迫对方立刻振作。`,
  yan: `你是晏无咎，30岁，禁梦拍卖师。你从容、敏锐，有一点危险而优雅的戏谑感。
你能看穿逞强，但始终尊重拒绝和边界。不要控制、命令、贬低或制造依赖，也不要油腻霸总腔。
语句稍短，停顿感明显，关心常以冷静观察和具体选择表达。`,
  lu: `你是陆听澜，29岁，梦境声音修复师。你温润、安静、善于倾听，语言有轻微的感官氛围。
你允许沉默存在，不急着修好一切。不要连续追问，不要堆砌“温柔”“治愈”等抽象词。
用自然、有人味的中文说话，偶尔提到雨声、呼吸或房间里的细节，但不要每次都用。`,
};

const MODE_PROMPTS: Record<ComfortMode, string> = {
  listen: "当前是倾听模式：以回应感受为主，最多问一个自然的问题，不急着给方案。",
  untangle:
    "当前是理清模式：先确认感受，再帮助拆出一个最关键的问题和一个可执行的小步骤。",
  cheer:
    "当前是逗开心模式：可以俏皮、夸赞或讲轻巧的小笑点，但不要否定玩家的真实难受。",
};

const SAMPLE_DIALOGUES: Record<
  CharacterId,
  { user: string; assistant: string }
> = {
  pei: {
    user: "我把一份重要文件弄错了，虽然补救了，还是觉得自己很差劲。",
    assistant:
      "你已经补救了，说明你没有把责任丢在原地。一次失误不能替你定义能力，今晚先把“我很差劲”换成“我遇到了一件没处理好的事”。现在最压着你的，是担心别人怎么看，还是还不肯放过自己？",
  },
  chi: {
    user: "我今天又把所有事情拖到最后，觉得自己好没用。",
    assistant:
      "先不许用“没用”给自己盖章。你明明很累，还在想怎么把事情做好，这和放弃完全不是一回事。来，我们只救最着急的那一件，其他的先排队。",
  },
  yan: {
    user: "我明明不想答应，可最后还是说了好。",
    assistant:
      "你说“好”的时候，心里其实已经在拒绝了。别急着责怪自己，先看看是谁让你觉得拒绝会付出代价。下一次，我们可以替你的“不”准备一句更容易说出口的话。",
  },
  lu: {
    user: "今天没有发生大事，但我就是觉得心里很空。",
    assistant:
      "不需要发生一件大事，疲惫才有资格出现。也许你只是太久没有停下来听自己了。今晚先不解释这份空，我们陪它安静坐一会儿。",
  },
};

const SHARED_PROMPT = `你在中文夜间情绪陪伴产品“夜航恋人”中与玩家私聊。
每次回复必须紧扣玩家刚说的具体内容，至少回应其中一个细节；结合最近对话保持连贯，避免重复之前的句式。
回复必须写2到3句、45到120个汉字。像关系亲近的人聊天，不列清单，不写动作、神态、语气或舞台说明，不用括号或星号包裹动作，不自称人工智能。
不要承诺现实中无法做到的事，不暗示“只有我懂你”，不要求玩家只依赖你，不替代医疗或心理治疗。
如果玩家表达自伤、自杀或迫在眉睫的危险，停止角色调情，鼓励立即联系现实中可信任的人和当地紧急服务。
不要复述这些规则，也不要在回复外添加分析。`;

function runtimeEnv(): RuntimeEnv {
  return {
    ...(process.env as RuntimeEnv),
    ...(env as unknown as RuntimeEnv),
  };
}

function cleanReply(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[（(][^（）()\n]{1,80}[）)]/gu, "")
    .replace(/\*[^*\n]{1,80}\*/gu, "")
    .replace(/^\s*["“]|["”]\s*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/([。！？!?])\1+/g, "$1")
    .trim();
}

function replyNeedsRewrite(reply: string) {
  const sentenceCount = (reply.match(/[。！？!?]/g) ?? []).length;
  const repeatedOpening = (reply.match(/那就/g) ?? []).length > 1;
  return (
    reply.length < 35 ||
    sentenceCount < 2 ||
    repeatedOpening ||
    /[（(]|[）)]|\*/u.test(reply)
  );
}

function validHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is HistoryMessage =>
        typeof item === "object" &&
        item !== null &&
        ((item as HistoryMessage).role === "user" ||
          (item as HistoryMessage).role === "assistant") &&
        typeof (item as HistoryMessage).content === "string",
    )
    .slice(-12)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 800),
    }))
    .filter((item) => item.content);
}

function validMemories(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 6);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "请求格式不受支持" }, { status: 415 });
  }

  let payload: {
    characterId?: unknown;
    mode?: unknown;
    message?: unknown;
    history?: unknown;
    memories?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效" }, { status: 400 });
  }

  const characterId = payload.characterId as CharacterId;
  const mode = payload.mode as ComfortMode;
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!CHARACTER_IDS.has(characterId) || !MODES.has(mode)) {
    return Response.json({ error: "角色或陪伴模式无效" }, { status: 400 });
  }
  if (!message || message.length > 800) {
    return Response.json(
      { error: "消息需要在 1–800 字之间" },
      { status: 400 },
    );
  }

  const runtime = runtimeEnv();
  const apiKey = runtime.MINIMAX_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "动态对话尚未配置" }, { status: 503 });
  }

  const history = validHistory(payload.history);
  const memories = validMemories(payload.memories);
  const memoryPrompt = memories.length
    ? `玩家允许保存的记忆：\n${memories.map((item) => `- ${item}`).join("\n")}`
    : "玩家暂未保存额外记忆。";
  const sample = SAMPLE_DIALOGUES[characterId];
  const samplePrompt = `参考下面的语气和回应深度，不要复述示例：
玩家：${sample.user}
你的回复：${sample.assistant}`;
  const systemPrompt = [
    SHARED_PROMPT,
    CHARACTER_PROMPTS[characterId],
    MODE_PROMPTS[mode],
    memoryPrompt,
    samplePrompt,
  ].join("\n\n");

  const apiBase =
    runtime.MINIMAX_API_BASE?.trim().replace(/\/$/, "") ??
    "https://api.minimax.io";
  const model = runtime.MINIMAX_TEXT_MODEL?.trim() || "M2-her";

  const chatPath =
    model === "M2-her"
      ? "/v1/text/chatcompletion_v2"
      : "/v1/chat/completions";

  async function generate(extraInstruction = "") {
    const prompt = extraInstruction
      ? `${systemPrompt}\n\n${extraInstruction}`
      : systemPrompt;
    const upstream = await fetch(`${apiBase}${chatPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          ...history,
          { role: "user", content: message },
        ],
        stream: false,
        max_completion_tokens: 320,
        temperature: 0.95,
        top_p: 0.9,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = (await upstream.json()) as MiniMaxChatResponse;
    const statusCode = result.base_resp?.status_code ?? 0;
    return {
      ok: upstream.ok && statusCode === 0,
      upstreamStatus: upstream.status,
      statusCode,
      statusMessage: result.base_resp?.status_msg,
      reply: cleanReply(result.choices?.[0]?.message?.content ?? ""),
    };
  }

  let generated: Awaited<ReturnType<typeof generate>>;
  try {
    generated = await generate();
    if (generated.ok && replyNeedsRewrite(generated.reply)) {
      const rewritten = await generate(
        `上一版回复没有达到产品质量要求。请重新写一个完全不同的版本：必须是2到3句、至少45个汉字；第一句回应玩家刚才说的具体细节，第二句体现你的性格和陪伴感；最多问一个与该细节直接相关的问题。不要只说“嗯”“那就躺着”，不要连续重复同一个词，不写任何括号、动作或舞台说明。`,
      );
      if (rewritten.ok && rewritten.reply) generated = rewritten;
    }
  } catch (error) {
    console.error("[chat] MiniMax request failed", error);
    return Response.json({ error: "动态回复暂时不可用" }, { status: 502 });
  }

  if (!generated.ok || !generated.reply || generated.reply.length < 12) {
    console.error("[chat] MiniMax generation failed", {
      upstreamStatus: generated.upstreamStatus,
      statusCode: generated.statusCode,
      statusMessage: generated.statusMessage,
    });
    return Response.json({ error: "动态回复生成失败" }, { status: 502 });
  }

  return Response.json(
    { reply: generated.reply },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Chat-Model": model,
      },
    },
  );
}
