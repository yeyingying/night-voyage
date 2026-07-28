import { env } from "cloudflare:workers";
import {
  CHARACTER_IDS,
  DEFAULT_VOICES,
  isValidVoiceId,
  type CharacterId,
} from "@/lib/voice-config";

type RuntimeEnv = {
  MINIMAX_API_KEY?: string;
  MINIMAX_API_BASE?: string;
  MINIMAX_VOICE_PEI?: string;
  MINIMAX_VOICE_CHI?: string;
  MINIMAX_VOICE_YAN?: string;
  MINIMAX_VOICE_LU?: string;
  MINIMAX_VOICE_CHENG?: string;
  MINIMAX_VOICE_QI?: string;
  MINIMAX_VOICE_SHEN?: string;
  MINIMAX_VOICE_XU?: string;
  ENABLE_VOICE_STUDIO?: string;
};

type MiniMaxVoice = {
  voice_id?: string;
  voice_name?: string;
  description?: string[];
  created_time?: string;
};

type MiniMaxVoiceListResponse = {
  system_voice?: MiniMaxVoice[];
  voice_cloning?: MiniMaxVoice[];
  voice_generation?: MiniMaxVoice[];
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

type VoiceType = "system" | "voice_cloning" | "voice_generation";

function runtimeEnv(): RuntimeEnv {
  return {
    ...(process.env as RuntimeEnv),
    ...(env as unknown as RuntimeEnv),
  };
}

function configuredDefaults(runtime: RuntimeEnv) {
  return Object.fromEntries(
    CHARACTER_IDS.map((characterId) => {
      const key =
        `MINIMAX_VOICE_${characterId.toUpperCase()}` as keyof RuntimeEnv;
      return [
        characterId,
        runtime[key]?.trim() || DEFAULT_VOICES[characterId],
      ];
    }),
  ) as Record<CharacterId, string>;
}

function normalizeVoice(voice: MiniMaxVoice, type: VoiceType) {
  const id = voice.voice_id?.trim() ?? "";
  if (!isValidVoiceId(id)) return null;
  const suffix = id.length > 16 ? id.slice(-10) : id;
  const fallbackName =
    type === "system"
      ? id.replaceAll("_", " ")
      : type === "voice_cloning"
        ? `克隆声线 ${suffix}`
        : `生成声线 ${suffix}`;
  return {
    id,
    name: voice.voice_name?.trim() || fallbackName,
    type,
    description: Array.isArray(voice.description)
      ? voice.description.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    createdAt: voice.created_time ?? "",
  };
}

export async function GET() {
  const runtime = runtimeEnv();
  if (
    process.env.NODE_ENV === "production" &&
    runtime.ENABLE_VOICE_STUDIO !== "true"
  ) {
    return Response.json({ error: "开发者声线工作台未开启" }, { status: 404 });
  }

  const apiKey = runtime.MINIMAX_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "尚未配置语音服务密钥" }, { status: 503 });
  }

  const apiBase =
    runtime.MINIMAX_API_BASE?.trim().replace(/\/$/, "") ??
    "https://api.minimax.io";

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}/v1/get_voice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ voice_type: "all" }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[voices] MiniMax request failed", error);
    return Response.json({ error: "暂时无法读取声线列表" }, { status: 502 });
  }

  let result: MiniMaxVoiceListResponse;
  try {
    result = (await upstream.json()) as MiniMaxVoiceListResponse;
  } catch {
    return Response.json({ error: "声线服务返回内容异常" }, { status: 502 });
  }

  const statusCode = result.base_resp?.status_code ?? 0;
  if (!upstream.ok || statusCode !== 0) {
    console.error("[voices] MiniMax list failed", {
      upstreamStatus: upstream.status,
      statusCode,
      statusMessage: result.base_resp?.status_msg,
    });
    return Response.json({ error: "读取声线列表失败" }, { status: 502 });
  }

  const voices = [
    ...(result.voice_generation ?? []).map((voice) =>
      normalizeVoice(voice, "voice_generation"),
    ),
    ...(result.voice_cloning ?? []).map((voice) =>
      normalizeVoice(voice, "voice_cloning"),
    ),
    ...(result.system_voice ?? []).map((voice) =>
      normalizeVoice(voice, "system"),
    ),
  ].filter((voice) => voice !== null);

  return Response.json(
    {
      voices,
      defaults: configuredDefaults(runtime),
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
