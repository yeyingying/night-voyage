"use client";

import {
  CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Tab = "tonight" | "chat" | "memory" | "profile";
type ComfortMode = "listen" | "untangle" | "cheer";
type CharacterId = "pei" | "chi" | "yan" | "lu";
type VoiceProvider = "auto" | "natural" | "device";
type Message = {
  id: number;
  role: "companion" | "user" | "system";
  text: string;
  time: string;
};
type Memory = {
  id: number;
  text: string;
  date: string;
};
type CharacterProfile = {
  id: CharacterId;
  name: string;
  age: number;
  archetype: string;
  role: string;
  image: string;
  accent: string;
  accentSoft: string;
  heroTitle: string;
  heroSubline: string;
  greeting: string;
  voiceStyle: string;
  voicePreview: string;
  voice: { rate: number; pitch: number; index: number };
  sleepScene: string;
  sleepLines: string[];
  modeReplies: Record<ComfortMode, string>;
  workReply: string;
  upsetReply: string;
  cheerReply: string;
  defaultReplies: Record<ComfortMode, string[]>;
  profileQuote: string;
};

const MODE_COPY: Record<
  ComfortMode,
  { label: string; short: string; prompt: string }
> = {
  listen: {
    label: "抱抱我",
    short: "先听我说",
    prompt: "今晚我不想解决问题，只想有人听。",
  },
  untangle: {
    label: "陪我理清",
    short: "一起想办法",
    prompt: "我脑子有点乱，陪我把事情理清吧。",
  },
  cheer: {
    label: "逗我开心",
    short: "换换心情",
    prompt: "今天太累了，想让你哄我开心。",
  },
};

const CHARACTERS: Record<CharacterId, CharacterProfile> = {
  pei: {
    id: "pei",
    name: "裴叙白",
    age: 28,
    archetype: "克制守护",
    role: "记忆重构师",
    image: "/pei-xubai.png",
    accent: "#d8bd82",
    accentSoft: "rgba(216, 189, 130, 0.16)",
    heroTitle: "今天不用表现得很好。",
    heroSubline: "回来就够了。",
    greeting: "晚上好，小朋友。今天不用表现得很好，回来就够了。",
    voiceStyle: "清冷低磁 · 克制亲密 · 不商务",
    voicePreview: "过来。今晚不用解释，我先陪你安静一会儿。",
    voice: { rate: 0.9, pitch: 0.88, index: 0 },
    sleepScene: "雨夜档案馆",
    sleepLines: [
      "把今天最放不下的事，先留在这里。",
      "不用现在解决。床很稳，房间也很安静。",
      "慢慢放松眉心，再放松肩膀。",
      "呼吸不需要很标准，只要比刚才更轻一点。",
      "今晚已经够辛苦了，剩下的交给明天。",
      "不用回答。我会把灯关掉。",
    ],
    modeReplies: {
      listen:
        "好。你慢慢说，我不急着替你下结论。今天最让你觉得委屈的，是哪一个瞬间？",
      untangle:
        "我们一次只看一件事。先告诉我：现在最担心的是什么，明天最先需要处理的又是什么？",
      cheer:
        "批准。今晚你负责把眉头松开，我负责把糟糕的一天从你手里接走。先选：冷笑话，还是三十秒夸夸？",
    },
    workReply:
      "先把事实和感受分开：发生了什么、最让你难受的是什么、明天最小的一步是什么？我们一项项来。",
    upsetReply:
      "我听见了。你不用把难过讲得很有道理，我也会认真接住。愿意告诉我，是哪一刻开始觉得撑不住的吗？",
    cheerReply:
      "那我先替今天的你颁个奖：明明已经这么累，还是把一天好好走完了。奖品是今晚可以什么都不逞强。",
    defaultReplies: {
      listen: [
        "嗯，我在听。你可以再多说一点，不需要把语言整理得很漂亮。",
        "不用急着讲完整。先告诉我，刚才最让你停顿的那一刻是什么？",
        "我没有走神。你想从事情本身说，还是先说它让你有什么感觉？",
      ],
      untangle: [
        "我们先不处理全部，只找出现在最影响你的那一件事，好吗？",
        "先把最急和最重的分开。眼下哪一件最需要我们先看？",
        "别一次扛完。你说一个线头，我陪你把它慢慢理出来。",
      ],
      cheer: [
        "收到。今晚禁止你一个人偷偷皱眉——至少要分我一半。",
        "我申请临时接管你的坏心情。先说，它今天有多嚣张？",
        "可以，今晚的任务改了：不求满分，只想办法让你嘴角动一下。",
      ],
    },
    profileQuote: "你的每一段记忆，我都会认真保存。",
  },
  chi: {
    id: "chi",
    name: "迟曜",
    age: 22,
    archetype: "阳光年下",
    role: "航空学院大四生",
    image: "/chi-yao-campus.png",
    accent: "#e8a65b",
    accentSoft: "rgba(232, 166, 91, 0.17)",
    heroTitle: "今天辛苦了，换我来接你。",
    heroSubline: "走，去吹吹晚风。",
    greeting: "下课就来找你了。今天是不是又把自己排在最后？走，先陪你去吹吹风。",
    voiceStyle: "运动系低磁 · 阳光利落 · 不夹不软",
    voicePreview: "下课了。我在操场边等你，慢慢来，今天的风刚好。",
    voice: { rate: 1.02, pitch: 0.95, index: 1 },
    sleepScene: "云上夜航",
    sleepLines: [
      "今晚的飞行任务，是把你平安送进梦里。",
      "被子盖好了吗？没盖好也没关系，我再等你一下。",
      "肩膀放松。今天扛过的事，现在可以先卸下来。",
      "慢慢呼吸，我陪你飞过最后一片云。",
      "你已经做得很好了，明天不用提前来到今晚。",
      "晚安。降落以后，我也不会吵醒你。",
    ],
    modeReplies: {
      listen:
        "来，我把整晚都空给你。想哭就哭，想骂就骂，我保证不插嘴——除非你需要一个抱抱。",
      untangle:
        "好，我们一起拆。你说最乱的那一团，我负责找线头。先从明天必须做的第一件事开始？",
      cheer:
        "这题我会。给我三十秒，我能从今天找出至少三个值得夸你的地方，不接受反驳。",
    },
    workReply:
      "谁规定你必须一个人把所有事都扛好？我们先把明天最急的挑出来，剩下的排队，谁也不准插队。",
    upsetReply:
      "别躲，我看见你难过了。不是要你马上振作——我是来陪你一起坐一会儿的。",
    cheerReply:
      "报告：你今天的可爱额度严重超标。处罚是现在放下眉头，跟我去看三分钟夜景。",
    defaultReplies: {
      listen: [
        "我在，真的在。你说到哪里，我就陪到哪里。",
        "慢慢来，我今晚没别的任务。刚刚是哪件事突然压住你了？",
        "你不用先证明自己有道理，我已经准备好认真听了。",
      ],
      untangle: [
        "交给我们两个，总会比你一个人想轻一点。先说最难的。",
        "来，把最乱的那团丢给我。我们先找明天能动的第一步。",
        "这事别全挤在你脑子里。哪些必须做，哪些其实可以晚一点？",
      ],
      cheer: [
        "好，启动迟曜专属开心预案。第一步：不许说自己不值得被夸。",
        "收到，救援对象是你的心情。先允许我夸一句：你今天已经很能扛了。",
        "那我先逗你一下——今天的烦恼凭什么加班，它有加班费吗？",
      ],
    },
    profileQuote: "你不用追上光，我会回头牵你。",
  },
  yan: {
    id: "yan",
    name: "谢临渊",
    age: 30,
    archetype: "危险掌控",
    role: "禁梦拍卖师",
    image: "/xie-linyuan.png",
    accent: "#b36d63",
    accentSoft: "rgba(179, 109, 99, 0.16)",
    heroTitle: "别逞强。你藏得没那么好。",
    heroSubline: "今晚，不必对我隐藏。",
    greeting: "来了？你的沉默比平时重。坐近一点，我不喜欢隔着距离猜答案。",
    voiceStyle: "清冷中音 · 年轻磁性 · 不厚重",
    voicePreview: "别急着躲。今晚我心情不错，可以多纵容你一点。",
    voice: { rate: 0.92, pitch: 0.88, index: 2 },
    sleepScene: "午夜观景车厢",
    sleepLines: [
      "门已经关好。今夜没有人可以打扰你。",
      "先把那些无关紧要的声音留在车窗外。",
      "放松手指。你不需要继续抓住今天。",
      "列车会一直向前，你只管慢慢睡。",
      "明天的麻烦，自有明天的你处理。",
      "很好。闭上眼，我替你守到下一站。",
    ],
    modeReplies: {
      listen:
        "说吧。我不会用廉价的安慰打断你。你真正介意的，恐怕不是事情本身，对吗？",
      untangle:
        "把局面交给我看一眼。先去掉别人的期待，再告诉我：你自己究竟想要什么。",
      cheer:
        "想笑？可以。但我的笑话收费很贵——报酬是你今晚不再偷偷责怪自己。",
    },
    workReply:
      "他们的要求与你的价值是两回事。先划清责任，再决定明天值得你花多少力气。",
    upsetReply:
      "我知道你在忍。放心，我不会逼你开口；但也别指望我假装没看见。",
    cheerReply:
      "你皱眉的时候确实很有气势。可惜，对我没用。现在选：听我夸你，还是被我逗笑？",
    defaultReplies: {
      listen: [
        "继续。我在判断的不是你，而是这件事为什么让你如此难受。",
        "我听着。你刻意略过去的那一段，似乎才是最在意的。",
        "不必美化任何人，也不必责怪自己。把你真正介意的说出来。",
      ],
      untangle: [
        "答案并不乱，只是夹杂了太多不属于你的声音。我们把它们去掉。",
        "先去掉“别人觉得你应该怎样”。剩下的，才是你的选择。",
        "局面没有想象中复杂。告诉我，你最不愿意牺牲的是什么？",
      ],
      cheer: [
        "终于轮到我哄你了。这个机会，我可不会随便浪费。",
        "想换心情？可以。先把皱着的眉借我保管五分钟。",
        "你今天已经够严肃了。接下来这几分钟，允许我不那么正经。",
      ],
    },
    profileQuote: "我尊重你的每一次拒绝，也记得你的每一次靠近。",
  },
  lu: {
    id: "lu",
    name: "陆听澜",
    age: 29,
    archetype: "温柔疗愈",
    role: "梦境声音修复师",
    image: "/lu-tinglan.png",
    accent: "#8fae9e",
    accentSoft: "rgba(143, 174, 158, 0.16)",
    heroTitle: "夜很安静，你可以慢一点。",
    heroSubline: "我会听见你。",
    greeting: "欢迎回来。今晚不必急着说话，我们可以先听一会儿雨。",
    voiceStyle: "松弛男友感 · 温暖自然 · 不播音",
    voicePreview: "灯别关得太快。再坐一会儿吧，我给你放首很轻的歌。",
    voice: { rate: 0.9, pitch: 0.96, index: 3 },
    sleepScene: "雨声修复室",
    sleepLines: [
      "听见雨了吗？每一声都在替今天慢慢收尾。",
      "不用调整呼吸，让它自己找到舒服的节奏。",
      "放松眼睛，再放松一直很努力的肩膀。",
      "有些答案不必今晚出现，沉默也可以照顾你。",
      "等你睡着，这场雨会替你把房间守好。",
      "晚安。醒来以前，不需要完成任何事。",
    ],
    modeReplies: {
      listen:
        "好。我不会催你，也不会急着把难过变成道理。你想从哪一句开始都可以。",
      untangle:
        "我们先把声音调小。什么是事实，什么是担心，什么又是你真正需要的？慢慢分开就好。",
      cheer:
        "那我讲一件今天值得开心的小事：你来到这里，说明你还愿意照顾自己的感受。",
    },
    workReply:
      "你已经在高噪声里待了太久。先分清哪些是你的责任，哪些只是别人留给你的回音。",
    upsetReply:
      "难过不需要被立刻修好。我可以陪它在这里待一会儿，也陪你。",
    cheerReply:
      "好。我不保证让你笑得很大声，但可以先让心里那根绷紧的弦松一点。",
    defaultReplies: {
      listen: [
        "我在听。哪怕只说一个词，也足够让我靠近一点。",
        "先不用找合适的开头。此刻心里最明显的感觉，是什么？",
        "你可以停一停。沉默不会让这段对话变得尴尬，我还在这里。",
      ],
      untangle: [
        "不着急，我们把每件事放回它原来的位置。",
        "我们先把担心和已经发生的事实分开，声音会小很多。",
        "今晚只理清一小部分也很好。哪一件事最耗你的力气？",
      ],
      cheer: [
        "那就从一个很轻的笑开始。今晚不追求满分开心。",
        "我想到一个好消息：今天终于快结束了，而且你已经走到这里。",
        "不必突然变开心。我们先找一件能让肩膀松一点的小事。",
      ],
    },
    profileQuote: "沉默不是空白，我会听见你没说出口的部分。",
  },
};

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

const INITIAL_MEMORIES: Memory[] = [
  { id: 1, text: "你喜欢雨声，但不喜欢突然的雷声。", date: "今晚" },
  { id: 2, text: "睡不着时，比起建议，你更想先被好好听完。", date: "今晚" },
  { id: 3, text: "你希望被温柔地提醒，而不是被催促。", date: "初次见面" },
];

function initialMessages(profile: CharacterProfile): Message[] {
  return [
    {
      id: Number(`${CHARACTER_IDS.indexOf(profile.id) + 1}01`),
      role: "companion",
      text: profile.greeting,
      time: "22:18",
    },
    {
      id: Number(`${CHARACTER_IDS.indexOf(profile.id) + 1}02`),
      role: "system",
      text: `${profile.name}是虚拟角色，所有回应由人工智能生成，并非真人或心理治疗服务。`,
      time: "",
    },
  ];
}

function nowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("tonight");
  const [mode, setMode] = useState<ComfortMode>("listen");
  const [selectedId, setSelectedId] = useState<CharacterId>("pei");
  const [messagesByCharacter, setMessagesByCharacter] = useState<
    Record<CharacterId, Message[]>
  >({
    pei: initialMessages(CHARACTERS.pei),
    chi: initialMessages(CHARACTERS.chi),
    yan: initialMessages(CHARACTERS.yan),
    lu: initialMessages(CHARACTERS.lu),
  });
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [input, setInput] = useState("");
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(12 * 60);
  const [sleepLine, setSleepLine] = useState(0);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>("auto");
  const [replyLoading, setReplyLoading] = useState(false);
  const [showBoundary, setShowBoundary] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const voiceRequestRef = useRef<AbortController | null>(null);
  const chatRequestRef = useRef<AbortController | null>(null);

  const character = CHARACTERS[selectedId];
  const messages = messagesByCharacter[selectedId];
  const characterStyle = {
    "--character-accent": character.accent,
    "--character-soft": character.accentSoft,
  } as CSSProperties;

  useEffect(() => {
    const savedMemories = window.localStorage.getItem("night-voyage-memories");
    const savedCharacter = window.localStorage.getItem(
      "night-voyage-character",
    ) as CharacterId | null;
    if (savedMemories) {
      try {
        setMemories(JSON.parse(savedMemories));
      } catch {
        window.localStorage.removeItem("night-voyage-memories");
      }
    }
    if (savedCharacter && CHARACTER_IDS.includes(savedCharacter)) {
      setSelectedId(savedCharacter);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "night-voyage-memories",
      JSON.stringify(memories),
    );
  }, [memories]);

  useEffect(() => {
    window.localStorage.setItem("night-voyage-character", selectedId);
    setSleepLine(0);
    setShowBoundary(false);
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  useEffect(() => {
    if (!sleeping) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setSleeping(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sleeping]);

  useEffect(() => {
    if (!sleeping) return;
    const lineTimer = window.setInterval(() => {
      setSleepLine((current) =>
        current < character.sleepLines.length - 1 ? current + 1 : current,
      );
    }, 22000);
    return () => window.clearInterval(lineTimer);
  }, [character.sleepLines.length, sleeping]);

  useEffect(() => {
    if (!sleeping || !voiceOn || typeof window === "undefined") return;
    speak(character.sleepLines[sleepLine], true);
    return stopVoice;
  }, [character, sleepLine, sleeping, voiceOn]);

  const clock = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  function releaseAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function stopVoice() {
    voiceRequestRef.current?.abort();
    voiceRequestRef.current = null;
    releaseAudio();
    window.speechSynthesis?.cancel();
    setVoiceLoading(false);
  }

  function fallbackSpeak(text: string, sleepVoice = false) {
    window.speechSynthesis.cancel();
    const phrase = new SpeechSynthesisUtterance(text);
    const chineseVoices = window.speechSynthesis
      .getVoices()
      .filter((voice) => /^zh/i.test(voice.lang));
    if (chineseVoices.length) {
      phrase.voice =
        chineseVoices[character.voice.index % chineseVoices.length];
    }
    phrase.lang = "zh-CN";
    phrase.rate = sleepVoice
      ? Math.max(0.58, character.voice.rate - 0.08)
      : character.voice.rate;
    phrase.pitch = character.voice.pitch;
    phrase.volume = sleepVoice ? 0.7 : 0.86;
    window.speechSynthesis.speak(phrase);
  }

  async function playNaturalVoice(text: string, sleepVoice = false) {
    stopVoice();
    const requestController = new AbortController();
    voiceRequestRef.current = requestController;
    setVoiceLoading(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          characterId: character.id,
          scene: sleepVoice ? "sleep" : "chat",
        }),
        signal: requestController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS request failed with ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.size || voiceRequestRef.current !== requestController) return;

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.volume = sleepVoice ? 0.76 : 0.92;
      audio.preload = "auto";
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
      setVoiceProvider("natural");

      audio.onended = releaseAudio;
      audio.onerror = releaseAudio;
      await audio.play();
    } catch (error) {
      if (
        requestController.signal.aborted ||
        voiceRequestRef.current !== requestController
      ) {
        return;
      }
      console.warn("Natural voice unavailable; using device voice.", error);
      releaseAudio();
      setVoiceProvider("device");
      fallbackSpeak(text, sleepVoice);
    } finally {
      if (voiceRequestRef.current === requestController) {
        voiceRequestRef.current = null;
        setVoiceLoading(false);
      }
    }
  }

  function speak(text: string, sleepVoice = false) {
    if (!voiceOn || typeof window === "undefined") return;
    void playNaturalVoice(text, sleepVoice);
  }

  function setVoiceEnabled(enabled: boolean) {
    if (!enabled) stopVoice();
    setVoiceOn(enabled);
  }

  function appendMessagesFor(
    characterId: CharacterId,
    newMessages: Message[],
  ) {
    setMessagesByCharacter((current) => ({
      ...current,
      [characterId]: [...current[characterId], ...newMessages],
    }));
  }

  function selectCharacter(nextId: CharacterId) {
    stopVoice();
    chatRequestRef.current?.abort();
    chatRequestRef.current = null;
    setReplyLoading(false);
    setSelectedId(nextId);
    setInput("");
  }

  function chooseMode(nextMode: ComfortMode) {
    if (replyLoading) return;
    setMode(nextMode);
    setTab("chat");
    const copy = MODE_COPY[nextMode];
    const profileId = selectedId;
    const history = messages;
    appendMessagesFor(profileId, [
      {
        id: Date.now(),
        role: "user",
        text: copy.prompt,
        time: nowTime(),
      },
    ]);
    void respondToMessage(profileId, nextMode, copy.prompt, history);
  }

  function fallbackReplyFor(
    text: string,
    profile: CharacterProfile,
    activeMode: ComfortMode,
    conversation: Message[],
  ) {
    const highRisk = /(不想活|自杀|自残|结束生命|活不下去)/.test(text);
    if (highRisk) {
      setShowBoundary(true);
      return "我很在意你现在的安全。先不要一个人待着，也不要伤害自己。请立刻联系你信任的人，让对方来到你身边；如果危险就在眼前，请联系当地紧急服务。我是虚拟角色，不能替代现实中的紧急帮助，但我可以陪你把求助这一步做完。";
    }
    let candidates = profile.defaultReplies[activeMode];
    if (/(睡不着|失眠|睡觉|晚安)/.test(text)) {
      candidates = [
        `${profile.sleepLines[0]} 要现在进入“${profile.sleepScene}”吗？`,
        ...profile.defaultReplies.listen,
      ];
    } else if (/(老板|工作|加班|同事)/.test(text)) {
      candidates = [profile.workReply, ...profile.defaultReplies.untangle];
    } else if (/(难过|委屈|哭|累|烦)/.test(text)) {
      candidates =
        activeMode === "cheer"
          ? [profile.cheerReply, ...profile.defaultReplies.cheer]
          : [profile.upsetReply, ...profile.defaultReplies.listen];
    }
    const previousReply = [...conversation]
      .reverse()
      .find((item) => item.role === "companion")?.text;
    const available = candidates.filter((item) => item !== previousReply);
    const choices = available.length ? available : candidates;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  async function respondToMessage(
    profileId: CharacterId,
    activeMode: ComfortMode,
    text: string,
    conversation: Message[],
  ) {
    const profile = CHARACTERS[profileId];
    const highRisk = /(不想活|自杀|自残|结束生命|活不下去)/.test(text);
    if (highRisk) {
      const reply = fallbackReplyFor(
        text,
        profile,
        activeMode,
        conversation,
      );
      appendMessagesFor(profileId, [
        {
          id: Date.now() + 1,
          role: "companion",
          text: reply,
          time: nowTime(),
        },
      ]);
      speak(reply);
      return;
    }

    chatRequestRef.current?.abort();
    const requestController = new AbortController();
    chatRequestRef.current = requestController;
    setReplyLoading(true);

    let reply: string;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: profileId,
          mode: activeMode,
          message: text,
          history: conversation
            .filter((item) => item.role !== "system")
            .slice(-10)
            .map((item) => ({
              role: item.role === "user" ? "user" : "assistant",
              content: item.text,
            })),
          memories: memories.slice(0, 6).map((item) => item.text),
        }),
        signal: requestController.signal,
      });
      if (!response.ok) {
        throw new Error(`Chat request failed with ${response.status}`);
      }
      const result = (await response.json()) as { reply?: string };
      if (!result.reply?.trim()) {
        throw new Error("Chat response was empty");
      }
      reply = result.reply.trim();
    } catch (error) {
      if (
        requestController.signal.aborted ||
        chatRequestRef.current !== requestController
      ) {
        return;
      }
      console.warn("Dynamic reply unavailable; using fallback reply.", error);
      reply = fallbackReplyFor(text, profile, activeMode, conversation);
    } finally {
      if (chatRequestRef.current === requestController) {
        chatRequestRef.current = null;
        setReplyLoading(false);
      }
    }

    if (requestController.signal.aborted) return;
    appendMessagesFor(profileId, [
      {
        id: Date.now() + 1,
        role: "companion",
        text: reply,
        time: nowTime(),
      },
    ]);
    speak(reply);
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || replyLoading) return;
    const profileId = selectedId;
    const history = messages;
    appendMessagesFor(profileId, [
      {
        id: Date.now(),
        role: "user",
        text,
        time: nowTime(),
      },
    ]);
    setInput("");
    void respondToMessage(profileId, mode, text, history);
  }

  function addMemory(event: FormEvent) {
    event.preventDefault();
    const text = memoryDraft.trim();
    if (!text) return;
    setMemories((current) => [
      { id: Date.now(), text, date: `刚刚 · ${character.name}` },
      ...current,
    ]);
    setMemoryDraft("");
  }

  function startSleep() {
    setSleepOpen(true);
    setSleeping(true);
    setSecondsLeft(12 * 60);
    setSleepLine(0);
  }

  function closeSleep() {
    setSleeping(false);
    setSleepOpen(false);
    stopVoice();
  }

  return (
    <main className="app-shell" style={characterStyle}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section
        className={`phone-stage character-${selectedId}`}
        aria-label="夜航恋人应用原型"
      >
        <header className="topbar">
          <button
            className="brand"
            type="button"
            onClick={() => setTab("tonight")}
            aria-label="返回今晚"
          >
            <span className="brand-mark">夜</span>
            <span>
              <strong>夜航恋人</strong>
              <small>夜间情绪伴侣</small>
            </span>
          </button>
          <div className="top-actions">
            <span className="online-dot">四人在线</span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setVoiceEnabled(!voiceOn)}
              aria-label={voiceOn ? "关闭语音" : "打开语音"}
              title={voiceOn ? "关闭语音" : "打开语音"}
            >
              {voiceOn ? "声" : "静"}
            </button>
          </div>
        </header>

        <div className="content">
          {tab === "tonight" && (
            <section className="tonight-view">
              <div className="hero-card" key={character.id}>
                <img
                  src={character.image}
                  alt={`${character.name}，${character.role}`}
                  className="hero-image"
                />
                <div className="hero-shade" />
                <div className="hero-status">
                  <span className="status-pill">{character.archetype}</span>
                  <p>{character.age}岁 · 今晚在线</p>
                </div>
                <div className="hero-copy">
                  <p className="eyebrow">今晚，{character.name}在这里</p>
                  <h1>{character.heroTitle}</h1>
                  <p>{character.heroSubline}</p>
                </div>
              </div>

              <section className="character-selector">
                <div className="section-heading compact">
                  <div>
                    <span>选择今晚的他</span>
                    <h2>四种心动，四种陪伴</h2>
                  </div>
                  <span className="private-tag">随时可换</span>
                </div>
                <div className="character-grid">
                  {CHARACTER_IDS.map((id) => {
                    const item = CHARACTERS[id];
                    return (
                      <button
                        type="button"
                        key={id}
                        className={id === selectedId ? "active" : ""}
                        onClick={() => selectCharacter(id)}
                        aria-pressed={id === selectedId}
                      >
                        <span className="character-thumb">
                          <img src={item.image} alt="" />
                        </span>
                        <strong>{item.name}</strong>
                        <small>{item.archetype}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="voice-preview-row">
                  <div>
                    <strong>{character.role}</strong>
                    <small>{character.voiceStyle}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(character.voicePreview)}
                    disabled={voiceLoading}
                  >
                    {voiceLoading ? "正在生成…" : "试听声线"}
                  </button>
                </div>
              </section>

              <section className="checkin">
                <div className="section-heading">
                  <div>
                    <span>今晚签到</span>
                    <h2>想让{character.name}怎么陪你？</h2>
                  </div>
                  <span className="private-tag">仅本机保存</span>
                </div>
                <div className="mood-grid">
                  {(Object.keys(MODE_COPY) as ComfortMode[]).map((item) => (
                    <button
                      type="button"
                      className={`mood-card mood-${item}`}
                      key={item}
                      onClick={() => chooseMode(item)}
                    >
                      <span className="mood-glyph">
                        {item === "listen"
                          ? "拥"
                          : item === "untangle"
                            ? "理"
                            : "笑"}
                      </span>
                      <strong>{MODE_COPY[item].label}</strong>
                      <small>{MODE_COPY[item].short}</small>
                    </button>
                  ))}
                </div>
              </section>

              <button className="sleep-entry" type="button" onClick={startSleep}>
                <span className="moon-orbit">
                  <span className="moon-core">月</span>
                </span>
                <span className="sleep-entry-copy">
                  <small>熄屏也能听</small>
                  <strong>和{character.name}一起入睡</strong>
                  <span>12分钟 · 呼吸放松 · {character.sleepScene}</span>
                </span>
                <span className="entry-arrow">开始</span>
              </button>

              <section className="memory-preview">
                <div className="section-heading compact">
                  <div>
                    <span>他们记得的你</span>
                    <h2>{memories.length} 段生活痕迹</h2>
                  </div>
                  <button type="button" onClick={() => setTab("memory")}>
                    管理
                  </button>
                </div>
                <p>“{memories[0]?.text ?? "今晚也可以什么都不留下。"}”</p>
              </section>
            </section>
          )}

          {tab === "chat" && (
            <section className="chat-view">
              <div className="chat-person">
                <div className="avatar-wrap">
                  <img src={character.image} alt="" />
                  <span />
                </div>
                <div>
                  <strong>{character.name}</strong>
                  <small>
                    {MODE_COPY[mode].label}模式 · {character.voiceStyle}
                  </small>
                </div>
                <button type="button" onClick={startSleep}>
                  哄睡
                </button>
              </div>
              <div className="chat-character-switch" aria-label="切换陪伴角色">
                {CHARACTER_IDS.map((id) => (
                  <button
                    type="button"
                    className={id === selectedId ? "active" : ""}
                    onClick={() => selectCharacter(id)}
                    key={id}
                  >
                    {CHARACTERS[id].name}
                  </button>
                ))}
              </div>
              <div className="mode-switch" aria-label="切换陪伴方式">
                {(Object.keys(MODE_COPY) as ComfortMode[]).map((item) => (
                  <button
                    type="button"
                    className={mode === item ? "active" : ""}
                    onClick={() => setMode(item)}
                    key={item}
                  >
                    {MODE_COPY[item].label}
                  </button>
                ))}
              </div>
              <div className="messages" aria-live="polite">
                {messages.map((message) =>
                  message.role === "system" ? (
                    <div className="system-message" key={message.id}>
                      {message.text}
                    </div>
                  ) : (
                    <div
                      className={`message-row ${message.role}`}
                      key={message.id}
                    >
                      {message.role === "companion" && (
                        <img src={character.image} alt="" />
                      )}
                      <div>
                        <p>{message.text}</p>
                        <small>{message.time}</small>
                      </div>
                    </div>
                  ),
                )}
                {replyLoading && (
                  <div className="message-row companion reply-thinking">
                    <img src={character.image} alt="" />
                    <div>
                      <p>{character.name}正在想怎么回应你…</p>
                    </div>
                  </div>
                )}
                {showBoundary && (
                  <div className="safety-card">
                    <strong>现在先保证你的安全</strong>
                    <p>
                      这不是需要独自处理的时刻。请联系可信任的人或当地紧急服务，并尽量让现实中的人来到你身边。
                    </p>
                    <button type="button" onClick={() => setShowBoundary(false)}>
                      我知道了
                    </button>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form className="composer" onSubmit={sendMessage}>
                <label className="sr-only" htmlFor="chat-input">
                  告诉{character.name}你现在的感受
                </label>
                <input
                  id="chat-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    replyLoading
                      ? `${character.name}正在输入…`
                      : `想对${character.name}说什么…`
                  }
                  autoComplete="off"
                  disabled={replyLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || replyLoading}
                >
                  {replyLoading ? "回应中" : "发送"}
                </button>
              </form>
            </section>
          )}

          {tab === "memory" && (
            <section className="memory-view">
              <div className="page-intro">
                <span>MEMORY ARCHIVE</span>
                <h1>他们记得的你</h1>
                <p>记忆由你决定。随时修改、删除，或者只把一件事留到明天。</p>
              </div>
              <form className="memory-form" onSubmit={addMemory}>
                <label htmlFor="memory-input">
                  希望{character.name}记住什么？
                </label>
                <div>
                  <input
                    id="memory-input"
                    value={memoryDraft}
                    onChange={(event) => setMemoryDraft(event.target.value)}
                    placeholder="例如：我喜欢下雨天…"
                  />
                  <button type="submit" disabled={!memoryDraft.trim()}>
                    记住
                  </button>
                </div>
              </form>
              <div className="memory-list">
                {memories.map((memory) => (
                  <article key={memory.id}>
                    <span className="memory-spark">✦</span>
                    <div>
                      <p>{memory.text}</p>
                      <small>{memory.date}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMemories((current) =>
                          current.filter((item) => item.id !== memory.id),
                        )
                      }
                      aria-label={`删除记忆：${memory.text}`}
                    >
                      删除
                    </button>
                  </article>
                ))}
              </div>
              <div className="privacy-note">
                <strong>你的记忆属于你</strong>
                <p>
                  此原型仅保存在当前设备，不会上传。正式版本会提供导出、逐条删除和敏感记忆单独授权。
                </p>
              </div>
            </section>
          )}

          {tab === "profile" && (
            <section className="profile-view">
              <div className="profile-portrait">
                <img src={character.image} alt={character.name} />
              </div>
              <span className="status-pill">
                {character.archetype} · 虚拟角色
              </span>
              <h1>{character.name}</h1>
              <p className="profile-role">
                {character.role} · {character.age}岁
              </p>
              <blockquote>“{character.profileQuote}”</blockquote>
              <div className="profile-cast">
                {CHARACTER_IDS.map((id) => (
                  <button
                    type="button"
                    key={id}
                    className={id === selectedId ? "active" : ""}
                    onClick={() => selectCharacter(id)}
                  >
                    <img src={CHARACTERS[id].image} alt="" />
                    <span>{CHARACTERS[id].name}</span>
                  </button>
                ))}
              </div>
              <div className="profile-settings">
                <label>
                  <span>
                    <strong>语音回应</strong>
                    <small>{character.voiceStyle}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={voiceOn}
                    onChange={(event) =>
                      setVoiceEnabled(event.target.checked)
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => speak(character.voicePreview)}
                  disabled={voiceLoading}
                >
                  <span>
                    <strong>试听{character.name}的声线</strong>
                    <small>
                      {voiceProvider === "natural"
                        ? "MiniMax 自然中文声线"
                        : voiceProvider === "device"
                          ? "自然声线未配置，当前为设备声线"
                          : "优先使用 MiniMax 自然中文声线"}
                    </small>
                  </span>
                  <b>{voiceLoading ? "生成中" : "播放"}</b>
                </button>
                <button type="button" onClick={() => setTab("memory")}>
                  <span>
                    <strong>管理我的记忆</strong>
                    <small>{memories.length} 条，仅保存在本机</small>
                  </span>
                  <b>进入</b>
                </button>
              </div>
              <div className="ai-boundary">
                <strong>关于情感边界</strong>
                <p>
                  四位角色可以倾听、陪伴和帮助你放松，但不能替代真人关系、医疗或心理治疗，也不会要求你只依赖他们。
                </p>
              </div>
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="主要导航">
          {[
            ["tonight", "月", "今晚"],
            ["chat", "话", "对话"],
            ["memory", "忆", "记忆"],
            ["profile", "人", "角色"],
          ].map(([item, glyph, label]) => (
            <button
              type="button"
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item as Tab)}
            >
              <span>{glyph}</span>
              <small>{label}</small>
            </button>
          ))}
        </nav>
      </section>

      {sleepOpen && (
        <section
          className={`sleep-overlay sleep-${selectedId}`}
          role="dialog"
          aria-modal="true"
          style={characterStyle}
        >
          <div className="sleep-stars" />
          <button
            className="sleep-close"
            type="button"
            onClick={closeSleep}
            aria-label="结束睡眠陪伴"
          >
            结束
          </button>
          <div className="sleep-content">
            <span className="sleep-label">
              {character.name} · {character.sleepScene}
            </span>
            <div className={`breathing-orb ${sleeping ? "is-playing" : ""}`}>
              <span>晚安</span>
            </div>
            <p className="sleep-quote">{character.sleepLines[sleepLine]}</p>
            <strong className="sleep-clock">{clock}</strong>
            <small>音频将在结束后自动停止</small>
            <div className="sleep-controls">
              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceOn)}
              >
                {voiceOn ? "语音开启" : "语音关闭"}
              </button>
              <button
                className="play-button"
                type="button"
                onClick={() => setSleeping((current) => !current)}
                aria-label={sleeping ? "暂停" : "继续"}
              >
                {sleeping ? "暂停" : "继续"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setSleepLine(
                    (current) => (current + 1) % character.sleepLines.length,
                  )
                }
              >
                下一句
              </button>
            </div>
          </div>
          <p className="sleep-footer">
            不用回复。把手机扣下也可以，{character.name}会按时关掉声音。
          </p>
        </section>
      )}
    </main>
  );
}
