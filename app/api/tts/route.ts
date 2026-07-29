import { env } from "cloudflare:workers";
import {
  DEFAULT_VOICES,
  isCharacterId,
  isValidVoiceId,
  VOICE_SETTINGS,
  type CharacterId,
} from "@/lib/voice-config";
import {
  applyVoiceBreak,
  VOICE_PERFORMANCES,
  type PersonaVoiceMood,
} from "@/lib/persona-engine";

type VoiceScene = "chat" | "sleep";

type RuntimeEnv = {
  MINIMAX_API_KEY?: string;
  MINIMAX_API_BASE?: string;
  MINIMAX_SPEECH_MODEL?: string;
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

type MiniMaxResponse = {
  data?: {
    audio?: string;
    status?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  extra_info?: {
    usage_characters?: number;
    audio_length?: number;
  };
  trace_id?: string;
};

const SCENES = new Set<VoiceScene>(["chat", "sleep"]);
const SPEECH_MODELS = new Set(["speech-2.8-turbo", "speech-2.8-hd"]);
const VOICE_MOODS = new Set<PersonaVoiceMood>([
  "composed",
  "bright",
  "flustered",
  "concerned",
  "irritated",
  "guarded",
  "soft",
]);

function runtimeEnv(): RuntimeEnv {
  return {
    ...(process.env as RuntimeEnv),
    ...(env as unknown as RuntimeEnv),
  };
}

function customVoiceId(
  characterId: CharacterId,
  runtime: RuntimeEnv,
  requestedVoiceId?: string,
) {
  const studioEnabled =
    process.env.NODE_ENV !== "production" ||
    runtime.ENABLE_VOICE_STUDIO === "true";
  if (studioEnabled && requestedVoiceId) return requestedVoiceId;
  const key = `MINIMAX_VOICE_${characterId.toUpperCase()}` as keyof RuntimeEnv;
  return runtime[key]?.trim() || DEFAULT_VOICES[characterId];
}

function sleepPacing(text: string) {
  return text.replace(/([。！？])(?=.)/g, "$1<#0.32#>");
}

function hexToBytes(hex: string) {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("MiniMax returned invalid audio data");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return Response.json({ error: "请求格式不受支持" }, { status: 415 });
  }

  let payload: {
    text?: unknown;
    characterId?: unknown;
    scene?: unknown;
    voiceId?: unknown;
    model?: unknown;
    voiceMood?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const characterId = payload.characterId as CharacterId;
  const scene = (payload.scene ?? "chat") as VoiceScene;
  const requestedVoiceId =
    payload.voiceId === undefined
      ? undefined
      : isValidVoiceId(payload.voiceId)
        ? payload.voiceId
        : null;
  const requestedModel =
    typeof payload.model === "string" && SPEECH_MODELS.has(payload.model)
      ? payload.model
      : undefined;
  const voiceMood =
    typeof payload.voiceMood === "string" &&
    VOICE_MOODS.has(payload.voiceMood as PersonaVoiceMood)
      ? (payload.voiceMood as PersonaVoiceMood)
      : "composed";

  if (!text || text.length > 800) {
    return Response.json(
      { error: "语音文本需要在 1–800 字之间" },
      { status: 400 },
    );
  }
  if (!isCharacterId(characterId) || !SCENES.has(scene)) {
    return Response.json({ error: "角色或场景无效" }, { status: 400 });
  }
  if (requestedVoiceId === null) {
    return Response.json({ error: "声线标识无效" }, { status: 400 });
  }

  const runtime = runtimeEnv();
  const apiKey = runtime.MINIMAX_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "自然语音尚未配置，将使用设备声线" },
      { status: 503 },
    );
  }

  const voice = VOICE_SETTINGS[characterId];
  const performance =
    scene === "chat" ? VOICE_PERFORMANCES[characterId][voiceMood] : null;
  const configuredModel = runtime.MINIMAX_SPEECH_MODEL?.trim();
  const model =
    requestedModel ||
    (configuredModel && SPEECH_MODELS.has(configuredModel)
      ? configuredModel
      : "speech-2.8-turbo");
  const preparedText =
    scene === "sleep"
      ? sleepPacing(text)
      : performance
        ? applyVoiceBreak(text, characterId, voiceMood)
        : text;
  const selectedVoiceId = customVoiceId(
    characterId,
    runtime,
    requestedVoiceId,
  );

  let upstream: Response;
  try {
    const apiBase =
      runtime.MINIMAX_API_BASE?.trim().replace(/\/$/, "") ??
      "https://api.minimax.io";
    upstream = await fetch(`${apiBase}/v1/t2a_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        text: preparedText,
        stream: false,
        language_boost: "Chinese",
        output_format: "hex",
        voice_setting: {
          voice_id: selectedVoiceId,
          speed:
            scene === "sleep"
              ? voice.sleepSpeed
              : Math.min(
                  1.2,
                  Math.max(0.75, voice.speed + (performance?.speedDelta ?? 0)),
                ),
          vol: scene === "sleep" ? 0.86 : (performance?.volume ?? 1),
          pitch: voice.pitch + (performance?.pitchDelta ?? 0),
          emotion: performance?.emotion ?? voice.emotion,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
        subtitle_enable: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    console.error("[tts] MiniMax request failed", error);
    return Response.json(
      { error: "自然语音暂时不可用，将使用设备声线" },
      { status: 502 },
    );
  }

  let result: MiniMaxResponse;
  try {
    result = (await upstream.json()) as MiniMaxResponse;
  } catch {
    return Response.json(
      { error: "语音服务返回了无法识别的内容" },
      { status: 502 },
    );
  }

  const statusCode = result.base_resp?.status_code ?? 0;
  if (!upstream.ok || statusCode !== 0 || !result.data?.audio) {
    console.error("[tts] MiniMax synthesis failed", {
      upstreamStatus: upstream.status,
      statusCode,
      statusMessage: result.base_resp?.status_msg,
    });
    return Response.json(
      { error: "自然语音生成失败，将使用设备声线" },
      { status: 502 },
    );
  }

  try {
    const audio = hexToBytes(result.data.audio);
    const usageCharacters =
      result.extra_info?.usage_characters ?? text.length;
    const ratePerMillion = model.includes("turbo") ? 60 : 100;
    const estimatedCostUsd =
      (usageCharacters * ratePerMillion) / 1_000_000;
    return new Response(audio, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "audio/mpeg",
        "X-Audio-Length-Ms": String(result.extra_info?.audio_length ?? ""),
        "X-Estimated-Cost-Usd": estimatedCostUsd.toFixed(6),
        "X-Trace-Id": result.trace_id ?? "",
        "X-Usage-Characters": String(usageCharacters),
        "X-Voice-Id": selectedVoiceId,
        "X-Voice-Model": model,
        "X-Voice-Provider": "minimax",
      },
    });
  } catch (error) {
    console.error("[tts] MiniMax audio decode failed", error);
    return Response.json(
      { error: "语音音频解析失败，将使用设备声线" },
      { status: 502 },
    );
  }
}
