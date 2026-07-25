import { env } from "cloudflare:workers";

type CharacterId = "pei" | "chi" | "yan" | "lu";
type VoiceScene = "chat" | "sleep";
type MiniMaxEmotion = "calm" | "happy";

type RuntimeEnv = {
  MINIMAX_API_KEY?: string;
  MINIMAX_API_BASE?: string;
  MINIMAX_VOICE_PEI?: string;
  MINIMAX_VOICE_CHI?: string;
  MINIMAX_VOICE_YAN?: string;
  MINIMAX_VOICE_LU?: string;
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
};

const DEFAULT_VOICES: Record<CharacterId, string> = {
  pei: "ttv-voice-2026072523240526-Omu0wD2C",
  chi: "ttv-voice-2026072523425526-j8spGMFf",
  yan: "ttv-voice-2026072523430526-zZfm7sFe",
  lu: "ttv-voice-2026072523425726-5po0jdg9",
};

const VOICE_SETTINGS: Record<
  CharacterId,
  { speed: number; pitch: number; emotion: MiniMaxEmotion }
> = {
  pei: { speed: 0.94, pitch: 0, emotion: "calm" },
  chi: { speed: 1.01, pitch: 0, emotion: "calm" },
  yan: { speed: 0.98, pitch: 0, emotion: "calm" },
  lu: { speed: 0.96, pitch: 0, emotion: "calm" },
};

const CHARACTER_IDS = new Set<CharacterId>(["pei", "chi", "yan", "lu"]);
const SCENES = new Set<VoiceScene>(["chat", "sleep"]);

function runtimeEnv(): RuntimeEnv {
  return {
    ...(process.env as RuntimeEnv),
    ...(env as unknown as RuntimeEnv),
  };
}

function customVoiceId(characterId: CharacterId, runtime: RuntimeEnv) {
  const key = `MINIMAX_VOICE_${characterId.toUpperCase()}` as keyof RuntimeEnv;
  return runtime[key]?.trim() || DEFAULT_VOICES[characterId];
}

function sleepPacing(text: string) {
  return text.replace(/([。！？])(?=.)/g, "$1<#0.45#>");
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
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const characterId = payload.characterId as CharacterId;
  const scene = (payload.scene ?? "chat") as VoiceScene;

  if (!text || text.length > 800) {
    return Response.json(
      { error: "语音文本需要在 1–800 字之间" },
      { status: 400 },
    );
  }
  if (!CHARACTER_IDS.has(characterId) || !SCENES.has(scene)) {
    return Response.json({ error: "角色或场景无效" }, { status: 400 });
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
  const model = "speech-2.8-hd";
  const preparedText = scene === "sleep" ? sleepPacing(text) : text;

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
          voice_id: customVoiceId(characterId, runtime),
          speed: scene === "sleep" ? Math.max(0.8, voice.speed - 0.05) : voice.speed,
          vol: scene === "sleep" ? 0.86 : 1,
          pitch: voice.pitch,
          emotion: voice.emotion,
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
    return new Response(audio, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "audio/mpeg",
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
