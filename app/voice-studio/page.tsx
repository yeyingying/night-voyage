"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  CHARACTER_IDS,
  DEVELOPER_VOICE_STORAGE_KEY,
  isValidVoiceId,
  type CharacterId,
} from "@/lib/voice-config";
import {
  clearTtsUsage,
  readTtsUsage,
  recordTtsUsage,
  TTS_USAGE_EVENT,
  type TtsUsageEvent,
} from "@/lib/tts-usage";
import styles from "./page.module.css";

type VoiceType = "system" | "voice_cloning" | "voice_generation";
type VoiceFilter = "recommended" | VoiceType | "all";
type PreviewModel = "speech-2.8-turbo" | "speech-2.8-hd";

type VoiceOption = {
  id: string;
  name: string;
  type: VoiceType;
  description: string[];
  createdAt: string;
};

type VoiceListResponse = {
  voices?: VoiceOption[];
  defaults?: Record<CharacterId, string>;
  error?: string;
};

const CHARACTERS: Record<
  CharacterId,
  {
    name: string;
    role: string;
    image: string;
    preview: string;
    accent: string;
  }
> = {
  pei: {
    name: "裴叙白",
    role: "记忆重构师",
    image: "/pei-xubai.png",
    preview: "过来坐。今天的事先放一放，我陪你待会儿。",
    accent: "#b9c9dc",
  },
  chi: {
    name: "迟曜",
    role: "航空学院飞行系大四生",
    image: "/chi-yao.png",
    preview: "我下课了，在操场这边。你慢慢走，我等你。",
    accent: "#e2bd73",
  },
  yan: {
    name: "谢临渊",
    role: "禁梦拍卖师",
    image: "/xie-linyuan.png",
    preview: "别站那么远。过来坐，我听着。",
    accent: "#c59a92",
  },
  lu: {
    name: "陆听澜",
    role: "梦境声音修复师",
    image: "/lu-tinglan.png",
    preview: "灯先别关。再坐一会儿，我放点轻音乐。",
    accent: "#9fc4bd",
  },
  cheng: {
    name: "程聿安",
    role: "深夜书店主",
    image: "/cheng-yuan.png",
    preview: "书店还亮着灯。你慢慢来，我给你留了位置。",
    accent: "#86a68f",
  },
  qi: {
    name: "祁临川",
    role: "城市夜航救援队长",
    image: "/qi-linchuan.png",
    preview: "先停下来。今晚不用硬撑，按我说的慢慢呼吸。",
    accent: "#ba8a4e",
  },
  shen: {
    name: "沈砚辞",
    role: "睡眠模式研究员",
    image: "/shen-yanci.png",
    preview: "不用追求马上睡着。先把身体的警报关小一点。",
    accent: "#9796c4",
  },
  xu: {
    name: "许星野",
    role: "午夜星象馆导览员",
    image: "/xu-xingye.png",
    preview: "今晚你选路线，我负责一直跟上。走慢一点也没关系。",
    accent: "#67a4ba",
  },
};

const FILTERS: Array<{ value: VoiceFilter; label: string }> = [
  { value: "recommended", label: "推荐男声" },
  { value: "voice_generation", label: "生成声线" },
  { value: "voice_cloning", label: "克隆声线" },
  { value: "system", label: "系统声线" },
  { value: "all", label: "全部" },
];

const TYPE_LABELS: Record<VoiceType, string> = {
  system: "系统",
  voice_cloning: "克隆",
  voice_generation: "生成",
};

function storedAssignments() {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(DEVELOPER_VOICE_STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(
      CHARACTER_IDS.flatMap((id) =>
        typeof parsed[id] === "string" && isValidVoiceId(parsed[id])
          ? [[id, parsed[id]]]
          : [],
      ),
    ) as Partial<Record<CharacterId, string>>;
  } catch {
    return {};
  }
}

function isRecommendedMaleVoice(voice: VoiceOption) {
  if (voice.type !== "system") return true;
  const searchable = [
    voice.id,
    voice.name,
    ...voice.description,
  ].join(" ");
  const chinese = /(Chinese|Mandarin|普通话|中文|国语)/i.test(searchable);
  const male =
    /(male|man|boy|gentleman|young man|男|少年|青年|先生|哥哥|公子|大叔)/i.test(
      searchable,
    );
  const female =
    /(female|woman|girl|lady|女|少女|姐姐|太太)/i.test(searchable);
  return chinese && male && !female;
}

export default function VoiceStudio() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [defaults, setDefaults] = useState<Record<CharacterId, string> | null>(
    null,
  );
  const [assignments, setAssignments] = useState<
    Partial<Record<CharacterId, string>>
  >({});
  const [activeCharacter, setActiveCharacter] =
    useState<CharacterId>("pei");
  const [filter, setFilter] = useState<VoiceFilter>("recommended");
  const [query, setQuery] = useState("");
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewing, setPreviewing] = useState("");
  const [previewModel, setPreviewModel] =
    useState<PreviewModel>("speech-2.8-turbo");
  const [usage, setUsage] = useState<TtsUsageEvent[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioCacheRef = useRef<Map<string, Blob>>(new Map());

  const character = CHARACTERS[activeCharacter];

  useEffect(() => {
    const controller = new AbortController();
    const hydrateLocalState = window.setTimeout(() => {
      setAssignments(storedAssignments());
      setUsage(readTtsUsage());
    }, 0);

    const syncUsage = () => setUsage(readTtsUsage());
    window.addEventListener(TTS_USAGE_EVENT, syncUsage);
    window.addEventListener("storage", syncUsage);

    async function loadVoices() {
      try {
        const response = await fetch("/api/voices", {
          signal: controller.signal,
        });
        const result = (await response.json()) as VoiceListResponse;
        if (!response.ok || !result.voices || !result.defaults) {
          throw new Error(result.error || "没有读到声线列表");
        }
        setVoices(result.voices);
        setDefaults(result.defaults);
        setAssignments((current) => ({
          ...result.defaults,
          ...current,
        }));
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "没有读到声线列表",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadVoices();
    return () => {
      window.clearTimeout(hydrateLocalState);
      controller.abort();
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      window.removeEventListener(TTS_USAGE_EVENT, syncUsage);
      window.removeEventListener("storage", syncUsage);
    };
  }, []);

  const filteredVoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return voices
      .filter((voice) => {
        if (filter === "recommended") return isRecommendedMaleVoice(voice);
        if (filter === "all") return true;
        return voice.type === filter;
      })
      .filter((voice) => {
        if (!normalizedQuery) return true;
        return [voice.id, voice.name, ...voice.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 120);
  }, [filter, query, voices]);

  const voiceById = useMemo(
    () => new Map(voices.map((voice) => [voice.id, voice])),
    [voices],
  );
  const todayUsage = useMemo(() => {
    const today = new Date().toDateString();
    const events = usage.filter(
      (event) => new Date(event.createdAt).toDateString() === today,
    );
    return {
      calls: events.length,
      characters: events.reduce((sum, event) => sum + event.characters, 0),
      cost: events.reduce(
        (sum, event) => sum + event.estimatedCostUsd,
        0,
      ),
      studio: events.filter((event) => event.source === "studio-preview").length,
      chat: events.filter((event) => event.source === "chat").length,
      sleep: events.filter((event) => event.source === "sleep").length,
    };
  }, [usage]);

  function persist(next: Partial<Record<CharacterId, string>>) {
    setAssignments(next);
    window.localStorage.setItem(
      DEVELOPER_VOICE_STORAGE_KEY,
      JSON.stringify(next),
    );
  }

  function assignVoice(voiceId: string, voiceName?: string) {
    if (!isValidVoiceId(voiceId)) {
      setNotice("这个 voice_id 格式不对，请检查后再试");
      return;
    }
    persist({ ...assignments, [activeCharacter]: voiceId });
    setNotice(`已把${voiceName || "这条声线"}分配给${character.name}`);
  }

  function releaseAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  async function playBlob(blob: Blob, voiceId: string) {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audioUrlRef.current = audioUrl;
    audio.onended = () => {
      releaseAudio();
      setPreviewing("");
    };
    audio.onerror = () => {
      releaseAudio();
      setPreviewing("");
    };
    await audio.play();
    setPreviewing(voiceId);
  }

  async function previewVoice(voiceId: string) {
    if (!isValidVoiceId(voiceId)) {
      setNotice("请先输入有效的 voice_id");
      return;
    }
    releaseAudio();
    setPreviewing(voiceId);
    setNotice("");
    const cacheKey = [
      activeCharacter,
      voiceId,
      previewModel,
      character.preview,
    ].join("|");
    try {
      const cached = audioCacheRef.current.get(cacheKey);
      if (cached) {
        setNotice("正在播放缓存，本次没有调用 API");
        await playBlob(cached, voiceId);
        return;
      }
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: character.preview,
          characterId: activeCharacter,
          scene: "chat",
          voiceId,
          model: previewModel,
        }),
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "这次试听没有生成成功");
      }
      recordTtsUsage(response, {
        source: "studio-preview",
        characterId: activeCharacter,
        characters: character.preview.length,
        voiceId,
      });
      const blob = await response.blob();
      audioCacheRef.current.set(cacheKey, blob);
      await playBlob(blob, voiceId);
    } catch (previewError) {
      releaseAudio();
      setNotice(
        previewError instanceof Error
          ? previewError.message
          : "这次试听没有生成成功",
      );
      setPreviewing("");
    }
  }

  function resetUsage() {
    clearTtsUsage();
    setNotice("已清空这台设备上的用量记录");
  }

  function resetAssignments() {
    if (!defaults) return;
    persist(defaults);
    setNotice("已恢复默认声线");
  }

  async function copyConfig() {
    const lines = CHARACTER_IDS.map(
      (id) =>
        `MINIMAX_VOICE_${id.toUpperCase()}=${assignments[id] ?? defaults?.[id] ?? ""}`,
    ).join("\n");
    await navigator.clipboard.writeText(lines);
    setNotice("八位男主的声线配置已复制");
  }

  return (
    <main
      className={styles.page}
      style={{ "--studio-accent": character.accent } as CSSProperties}
    >
      <header className={styles.header}>
        <div>
          <span>开发者工具</span>
          <h1>给八位男主挑声音</h1>
          <p>
            先选角色，再用固定台词试听。这里的设置只给开发者看，玩家不会看到。
          </p>
        </div>
        <Link href="/">返回游戏</Link>
      </header>

      <section className={styles.usagePanel} aria-label="今日语音用量估算">
        <div>
          <span>这台设备今天的估算</span>
          <strong>${todayUsage.cost.toFixed(4)}</strong>
          <small>仅语音合成，不含套餐、声线设计或克隆费用</small>
        </div>
        <dl>
          <div>
            <dt>调用次数</dt>
            <dd>{todayUsage.calls} 次</dd>
          </div>
          <div>
            <dt>合成字符</dt>
            <dd>{todayUsage.characters}</dd>
          </div>
          <div>
            <dt>试听 / 聊天 / 哄睡</dt>
            <dd>
              {todayUsage.studio} / {todayUsage.chat} / {todayUsage.sleep}
            </dd>
          </div>
        </dl>
        <button type="button" onClick={resetUsage}>
          清空本地记录
        </button>
      </section>

      <section className={styles.cast} aria-label="选择要调音的男主">
        {CHARACTER_IDS.map((id) => {
          const item = CHARACTERS[id];
          const selectedVoice = assignments[id] ?? defaults?.[id];
          const selectedName = selectedVoice
            ? voiceById.get(selectedVoice)?.name || "自定义声线"
            : "尚未指定";
          return (
            <button
              type="button"
              key={id}
              className={activeCharacter === id ? styles.activeCast : ""}
              onClick={() => {
                releaseAudio();
                setPreviewing("");
                setActiveCharacter(id);
                setNotice("");
              }}
            >
              <img src={item.image} alt="" />
              <span>
                <strong>{item.name}</strong>
                <small>{item.role}</small>
                <b>{selectedName}</b>
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.workspace}>
        <aside className={styles.controls}>
          <div className={styles.activeProfile}>
            <img src={character.image} alt={character.name} />
            <div>
              <span>正在挑选</span>
              <strong>{character.name}</strong>
              <small>{character.preview}</small>
            </div>
          </div>

          <label className={styles.search}>
            <span>搜索声线</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入名称、描述或 voice_id"
            />
          </label>

          <div className={styles.quality}>
            <span>试听音质</span>
            <div>
              <button
                type="button"
                className={
                  previewModel === "speech-2.8-turbo"
                    ? styles.activeQuality
                    : ""
                }
                onClick={() => setPreviewModel("speech-2.8-turbo")}
              >
                日常试听
                <small>$60 / 百万字符</small>
              </button>
              <button
                type="button"
                className={
                  previewModel === "speech-2.8-hd"
                    ? styles.activeQuality
                    : ""
                }
                onClick={() => setPreviewModel("speech-2.8-hd")}
              >
                最终确认
                <small>$100 / 百万字符</small>
              </button>
            </div>
            <p>
              这句约 $
              {(
                (character.preview.length *
                  (previewModel === "speech-2.8-turbo" ? 60 : 100)) /
                1_000_000
              ).toFixed(4)}
              。同一句重复播放会直接用缓存。
            </p>
          </div>

          <div className={styles.filters}>
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? styles.activeFilter : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.manual}>
            <span>手动输入 voice_id</span>
            <input
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              placeholder="例如 ttv-voice-..."
            />
            <div>
              <button
                type="button"
                onClick={() => void previewVoice(manualId.trim())}
                disabled={!manualId.trim() || Boolean(previewing)}
              >
                试听
              </button>
              <button
                type="button"
                onClick={() => assignVoice(manualId.trim())}
                disabled={!manualId.trim()}
              >
                分配给{character.name}
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={resetAssignments}>
              恢复默认
            </button>
            <button type="button" onClick={() => void copyConfig()}>
              复制正式配置
            </button>
          </div>

          {notice && <p className={styles.notice}>{notice}</p>}
        </aside>

        <div className={styles.library}>
          <div className={styles.libraryHeading}>
            <div>
              <span>声线列表</span>
              <h2>试听{character.name}的台词</h2>
            </div>
            <b>{filteredVoices.length} 条</b>
          </div>

          {loading && (
            <div className={styles.skeletons} aria-label="正在读取声线">
              <i />
              <i />
              <i />
              <i />
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <strong>暂时没有读到声线列表</strong>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && filteredVoices.length === 0 && (
            <div className={styles.empty}>
              <strong>没有匹配的声线</strong>
              <p>换一个筛选条件，或者直接输入 voice_id。</p>
            </div>
          )}

          <div className={styles.voiceList}>
            {filteredVoices.map((voice) => {
              const selected =
                assignments[activeCharacter] === voice.id ||
                (!assignments[activeCharacter] &&
                  defaults?.[activeCharacter] === voice.id);
              return (
                <article
                  key={`${voice.type}-${voice.id}`}
                  className={selected ? styles.selectedVoice : ""}
                >
                  <div className={styles.voiceMeta}>
                    <span>{TYPE_LABELS[voice.type]}</span>
                    <strong>{voice.name}</strong>
                    <p>
                      {voice.description[0] ||
                        (voice.type === "system"
                          ? "MiniMax 系统声线"
                          : "你的账户声线")}
                    </p>
                    <code>{voice.id}</code>
                  </div>
                  <div className={styles.voiceActions}>
                    <button
                      type="button"
                      onClick={() => void previewVoice(voice.id)}
                      disabled={Boolean(previewing)}
                    >
                      {previewing === voice.id ? "生成中…" : "试听"}
                    </button>
                    <button
                      type="button"
                      onClick={() => assignVoice(voice.id, voice.name)}
                    >
                      {selected ? "已经选中" : `分配给${character.name}`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
