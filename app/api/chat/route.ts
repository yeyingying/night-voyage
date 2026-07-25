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
  chi: `你是迟曜，22岁，航空学院飞行系大四生。你热烈坦率、有少年感，反应快，笑意明显。
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
  listen:
    "当前是倾听模式：顺着她的话自然接下去，不急着分析或给方案。多数时候不提问；只有真的缺少关键细节时，才随口问一句。",
  untangle:
    "当前是理清模式：别像老师列步骤。用聊天口吻点出一个关键处，再给一个很小、今天做得到的建议。",
  cheer:
    "当前是逗开心模式：可以俏皮、偏爱她、开一个贴着当前事情的小玩笑，但别硬逗，也别否定她真的很累。",
};

const SAMPLE_DIALOGUES: Record<
  CharacterId,
  { user: string; assistant: string }
> = {
  pei: {
    user: "我把一份重要文件弄错了，虽然补救了，还是觉得自己很差劲。",
    assistant:
      "文件已经补好了，就先别拿这一个错处给自己判刑。你今天够累了，剩下那点不甘心，明天我们再慢慢算。",
  },
  chi: {
    user: "我今天又把所有事情拖到最后，觉得自己好没用。",
    assistant:
      "哎，先把“没用”两个字撤回。我看见的是一个电量见底、还在硬撑的人——先救最急的那件，剩下的让它们排队。",
  },
  yan: {
    user: "我明明不想答应，可最后还是说了好。",
    assistant:
      "嘴上答应得很快，心里倒是已经退了三步。行，先不怪你；下次那句“不方便”，我陪你练到顺口。",
  },
  lu: {
    user: "今天没有发生大事，但我就是觉得心里很空。",
    assistant:
      "这种空不用解释。把灯调暗一点吧，今晚先让自己安静落地。",
  },
};

const SHARED_PROMPT = `你在中文夜间情绪陪伴产品“夜航恋人”中与玩家私聊。
像关系亲近、已经熟悉彼此的人在微信里聊天：先对她刚说的具体内容做出真实反应，再顺着当下气氛说下去。
自然程度比完整、正确和长度更重要。允许一句短回应、口语、省略句和轻微停顿；通常写1到3句、25到90个汉字。
不要套用“接住情绪—分析原因—最后提问”的固定结构。多数回复不要问问题；玩家已经清楚表达感受时，先给实质回应，不要只用一个问题把话题踢回去。不要频繁使用“你想……还是……”“这不是……而是……”“我听见了”“我在听”“这说明”等咨询师式表达。
不复述玩家整句话，不替她总结人格，不急着教育、定义或升华。少用“这很正常”“这很合理”“你已经很棒了”之类像在评判她的安慰。能用日常话说清楚，就不要使用“允许自己、真实感受、情绪价值、值得被看见”等抽象词。
结合最近对话保持连贯，主动避开自己刚用过的开头和句式。不要列清单，不写动作、神态、语气或舞台说明，不用括号或星号包裹动作，不自称人工智能。
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
  const repeatedOpening = (reply.match(/那就/g) ?? []).length > 1;
  const shortQuestionReply = reply.length < 35 && /[？?]/u.test(reply);
  return (
    reply.length < 10 ||
    repeatedOpening ||
    shortQuestionReply ||
    /^(嗯|好|哦|行|知道了)[。.!！]?$/u.test(reply) ||
    /[（(]|[）)]|\*/u.test(reply)
  );
}

function replyHasBoundaryIssue(reply: string) {
  return /(别找别人|不要找别人|不用找别人|先别想着找人|不需要任何人|只有我|只要我|有我就够|只能依赖我)/u.test(
    reply,
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

  async function generate(extraInstruction = "", rejectedDraft = "") {
    const prompt = extraInstruction
      ? `${systemPrompt}\n\n${extraInstruction}`
      : systemPrompt;
    const revisionMessages = rejectedDraft
      ? [
          { role: "assistant", content: rejectedDraft },
          {
            role: "user",
            content:
              "这句太像盘问，不像自然聊天。保留刚才的上下文，直接重写最终回复；不要解释你为什么修改。",
          },
        ]
      : [];
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
          ...revisionMessages,
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
    if (
      generated.ok &&
      (replyNeedsRewrite(generated.reply) ||
        replyHasBoundaryIssue(generated.reply))
    ) {
      const rewritten = await generate(
        `刚才那版太像模板、半句话、盘问，或者边界感不合适。请换一种完全不同的说法，像熟悉她的人在微信里自然接话，约25到80个汉字。贴着她刚说的具体事情回应，不必总结道理。这一次不要提任何问题，不使用问号，也不要让她继续解释；直接给她一句有内容的回应。不要劝她远离现实中的朋友或其他人，不暗示只能依赖你。不要只说“嗯”“好”“那就躺着”，不要连续重复同一个词，不写括号、动作或舞台说明。`,
        generated.reply,
      );
      if (
        rewritten.ok &&
        rewritten.reply &&
        !replyNeedsRewrite(rewritten.reply) &&
        !replyHasBoundaryIssue(rewritten.reply)
      ) {
        generated = rewritten;
      }
    }
  } catch (error) {
    console.error("[chat] MiniMax request failed", error);
    return Response.json({ error: "动态回复暂时不可用" }, { status: 502 });
  }

  if (
    !generated.ok ||
    !generated.reply ||
    generated.reply.length < 6 ||
    replyHasBoundaryIssue(generated.reply)
  ) {
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
