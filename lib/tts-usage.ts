import type { CharacterId } from "@/lib/voice-config";

export type TtsUsageSource = "studio-preview" | "chat" | "sleep";

export type TtsUsageEvent = {
  id: string;
  createdAt: string;
  source: TtsUsageSource;
  characterId: CharacterId;
  characters: number;
  estimatedCostUsd: number;
  model: string;
  voiceId: string;
  traceId: string;
};

export const TTS_USAGE_STORAGE_KEY = "night-voyage-tts-usage-v1";
export const TTS_USAGE_EVENT = "night-voyage-tts-usage-change";

export function readTtsUsage(): TtsUsageEvent[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(TTS_USAGE_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as TtsUsageEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearTtsUsage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TTS_USAGE_STORAGE_KEY);
  window.dispatchEvent(new Event(TTS_USAGE_EVENT));
}

export function recordTtsUsage(
  response: Response,
  fallback: {
    source: TtsUsageSource;
    characterId: CharacterId;
    characters: number;
    voiceId?: string;
  },
) {
  if (typeof window === "undefined") return;
  const characters =
    Number.parseInt(response.headers.get("X-Usage-Characters") ?? "", 10) ||
    fallback.characters;
  const estimatedCostUsd =
    Number.parseFloat(response.headers.get("X-Estimated-Cost-Usd") ?? "") || 0;
  const event: TtsUsageEvent = {
    id:
      response.headers.get("X-Trace-Id") ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    source: fallback.source,
    characterId: fallback.characterId,
    characters,
    estimatedCostUsd,
    model: response.headers.get("X-Voice-Model") || "unknown",
    voiceId: response.headers.get("X-Voice-Id") || fallback.voiceId || "",
    traceId: response.headers.get("X-Trace-Id") || "",
  };
  const next = [...readTtsUsage(), event].slice(-500);
  window.localStorage.setItem(TTS_USAGE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(TTS_USAGE_EVENT));
}
