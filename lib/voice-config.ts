export type CharacterId =
  | "pei"
  | "chi"
  | "yan"
  | "lu"
  | "cheng"
  | "qi"
  | "shen"
  | "xu";
export type MiniMaxEmotion = "calm" | "happy";

export const DEVELOPER_VOICE_STORAGE_KEY =
  "night-voyage-developer-voices";

export const CHARACTER_IDS = [
  "pei",
  "chi",
  "yan",
  "lu",
  "cheng",
  "qi",
  "shen",
  "xu",
] as const;

export const DEFAULT_VOICES: Record<CharacterId, string> = {
  pei: "ttv-voice-2026072523240526-Omu0wD2C",
  chi: "English_Gentle-voiced_man",
  yan: "Chinese (Mandarin)_Reliable_Executive",
  lu: "Chinese (Mandarin)_Gentleman",
  cheng: "Chinese (Mandarin)_Gentleman",
  qi: "Chinese (Mandarin)_Reliable_Executive",
  shen: "ttv-voice-2026072523240526-Omu0wD2C",
  xu: "English_Gentle-voiced_man",
};

export const VOICE_SETTINGS: Record<
  CharacterId,
  {
    speed: number;
    sleepSpeed: number;
    pitch: number;
    emotion: MiniMaxEmotion;
  }
> = {
  pei: { speed: 0.95, sleepSpeed: 0.87, pitch: 0, emotion: "calm" },
  chi: { speed: 1.04, sleepSpeed: 0.94, pitch: 1, emotion: "calm" },
  yan: { speed: 0.99, sleepSpeed: 0.9, pitch: 0, emotion: "calm" },
  lu: { speed: 0.96, sleepSpeed: 0.87, pitch: 0, emotion: "calm" },
  cheng: { speed: 0.98, sleepSpeed: 0.88, pitch: 0, emotion: "calm" },
  qi: { speed: 0.97, sleepSpeed: 0.88, pitch: 0, emotion: "calm" },
  shen: { speed: 1, sleepSpeed: 0.9, pitch: 0, emotion: "calm" },
  xu: { speed: 1.03, sleepSpeed: 0.93, pitch: 1, emotion: "calm" },
};

export function isCharacterId(value: unknown): value is CharacterId {
  return (
    typeof value === "string" &&
    (CHARACTER_IDS as readonly string[]).includes(value)
  );
}

export function isValidVoiceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 256 &&
    /^[\p{L}\p{N}][\p{L}\p{N} _()\-]*$/u.test(value)
  );
}
