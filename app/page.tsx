"use client";

import {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DEVELOPER_VOICE_STORAGE_KEY } from "@/lib/voice-config";
import { recordTtsUsage } from "@/lib/tts-usage";

type Tab = "tonight" | "chat" | "memory" | "profile";
type CharacterId =
  | "pei"
  | "chi"
  | "yan"
  | "lu"
  | "cheng"
  | "qi"
  | "shen"
  | "xu";
type VisualStyle = "manhwa" | "real";
type SleepMode = "settle" | "body" | "story";
type VoiceProvider = "auto" | "natural" | "device";
type AdultGateIntent = "intimacy" | "photo";
type VoiceCaptureState =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "error";
type Message = {
  id: number;
  role: "companion" | "user" | "system";
  text: string;
  time: string;
  kind?: "text" | "voice" | "image";
  audioUrl?: string;
  imageUrl?: string;
  imageName?: string;
  duration?: number;
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
  realImage: string;
  accent: string;
  accentSoft: string;
  heroTitle: string;
  heroSubline: string;
  greeting: string;
  voicePreview: string;
  voice: { rate: number; pitch: number; index: number };
  sleepScene: string;
  sleepLines: string[];
  workReply: string;
  upsetReply: string;
  cheerReply: string;
  fallbackReplies: string[];
  profileQuote: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorLike = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type PendingVoiceMessage = {
  profileId: CharacterId;
  history: Message[];
  duration: number;
};

const CHARACTERS: Record<CharacterId, CharacterProfile> = {
  pei: {
    id: "pei",
    name: "裴叙白",
    age: 28,
    archetype: "成熟守护系",
    role: "记忆重构师",
    image: "/pei-xubai.png",
    realImage: "/real-pei-xubai.jpg",
    accent: "#d8bd82",
    accentSoft: "rgba(216, 189, 130, 0.16)",
    heroTitle: "累了就先歇会儿。",
    heroSubline: "别急着把一切都想明白。",
    greeting: "回来了？先坐会儿。想说什么就说，不想说也没关系。",
    voicePreview: "过来坐。今天的事先放一放，我陪你待会儿。",
    voice: { rate: 0.9, pitch: 0.88, index: 0 },
    sleepScene: "雨夜档案馆",
    sleepLines: [
      "躺好了吗？今天先到这里。",
      "没做完的事，明天再说。",
      "眉头松一点，肩膀也别再绷着。",
      "不用刻意数呼吸，舒服就好。",
      "手机放旁边吧，我还在。",
      "晚安。睡吧。",
    ],
    workReply:
      "先把最急的那件挑出来，今晚只管它。做完来找我，我负责宣布你下班。",
    upsetReply:
      "受了委屈还得装没事，难怪撑不住。来我这儿就别表现得那么懂事了。",
    cheerReply:
      "今天已经够辛苦了，剩下这点时间归你休息，也归我管你别再逞强。",
    fallbackReplies: [
      "这事放谁身上都不好受。你不用急着讲完整，我听得懂。",
      "先别替别人找理由。在我这里，你可以只说自己不高兴。",
      "忙成这样还记得来找我，不错。先坐会儿，剩下的慢慢说。",
    ],
    profileQuote: "你说过的事，我会记得。",
  },
  chi: {
    id: "chi",
    name: "迟曜",
    age: 22,
    archetype: "阳光年下系",
    role: "航空学院大四生",
    image: "/chi-yao-campus.png",
    realImage: "/real-chi-yao.jpg",
    accent: "#e8a65b",
    accentSoft: "rgba(232, 166, 91, 0.17)",
    heroTitle: "我下课了，来找你。",
    heroSubline: "走，出去转一圈。",
    greeting: "我刚下课。你今天怎么样？看着像是攒了一肚子话。",
    voicePreview: "我下课了，在操场这边。你慢慢走，我等你。",
    voice: { rate: 1.02, pitch: 0.95, index: 1 },
    sleepScene: "云上夜航",
    sleepLines: [
      "被子盖好了吗？我等你躺好。",
      "手机放旁边吧，今天先到这儿。",
      "肩膀松一松，你又绷一天了。",
      "呼吸慢一点，我还没走。",
      "明天的事，明天再说。",
      "晚安，睡吧。",
    ],
    workReply:
      "先别骂自己。挑一件明天非做不可的，其他的先排队。做完回来，我给你发优秀学员奖。",
    upsetReply:
      "今天是真的把你欺负狠了。先不用笑，我认真陪你一会儿。",
    cheerReply:
      "好，坏心情先靠边站，排队也轮不到它。现在这个位置我要了。",
    fallbackReplies: [
      "这也太气人了。你先说，我保证今天不替对方找借口。",
      "不用组织语言，直接从最想吐槽的地方开始。我接得住。",
      "你一来我就看出来了，今天肯定有人惹你。胆子不小。",
    ],
    profileQuote: "累了就叫我，别一个人憋着。",
  },
  yan: {
    id: "yan",
    name: "谢临渊",
    age: 30,
    archetype: "冷傲引领系",
    role: "禁梦拍卖师",
    image: "/xie-linyuan.png",
    realImage: "/real-xie-linyuan.jpg",
    accent: "#b36d63",
    accentSoft: "rgba(179, 109, 99, 0.16)",
    heroTitle: "又在硬撑？我看得出来。",
    heroSubline: "坐过来，先缓一会儿。",
    greeting: "来了。脸色不太好。坐吧，想说就说。",
    voicePreview: "别站那么远。过来坐，我听着。",
    voice: { rate: 0.92, pitch: 0.88, index: 2 },
    sleepScene: "午夜观景车厢",
    sleepLines: [
      "门关好了，没人会来打扰。",
      "手机放远一点，那些消息明天再回。",
      "手松开，别再攥着被角。",
      "车厢很安静，你可以放心睡。",
      "明天的事，醒了再处理。",
      "闭上眼吧。我陪你到时间结束。",
    ],
    workReply:
      "别把所有人的要求都算成你的责任。先挑出真正该你管的那件，其他人自己的麻烦，让他们自己领回去。",
    upsetReply:
      "你已经忍得够久了。在我这里不用继续装得若无其事。",
    cheerReply:
      "你皱眉的样子很有气势。可惜，对我没什么威慑力。",
    fallbackReplies: [
      "这事没你说得那么轻。至少在我这里，不必再故作大方。",
      "你已经替别人想得够周到了。现在轮到你偏心自己一次。",
      "听起来，对方很擅长给别人添堵。可惜，今晚不准备让他继续得逞。",
    ],
    profileQuote: "不想说就不说，我不会逼你。",
  },
  lu: {
    id: "lu",
    name: "陆听澜",
    age: 29,
    archetype: "安静陪伴系",
    role: "梦境声音修复师",
    image: "/lu-tinglan.png",
    realImage: "/real-lu-tinglan.jpg",
    accent: "#8fae9e",
    accentSoft: "rgba(143, 174, 158, 0.16)",
    heroTitle: "今天很吵吧。",
    heroSubline: "这里可以安静一点。",
    greeting: "回来了。要是还不想说话，就先坐会儿，我陪你听听雨。",
    voicePreview: "灯先别关。再坐一会儿，我放点轻音乐。",
    voice: { rate: 0.9, pitch: 0.96, index: 3 },
    sleepScene: "雨声修复室",
    sleepLines: [
      "听见雨声了吗？躺舒服一点。",
      "不用管呼吸，怎么舒服怎么来。",
      "眼睛放松，肩膀也松一松。",
      "没想明白的事，今晚先不想了。",
      "雨还在下，房间很安静。",
      "晚安。你现在只需要睡觉。",
    ],
    workReply:
      "你今天已经听了太多人的要求。先圈出真正属于你的那一件，其余的今晚先静音。",
    upsetReply:
      "难过不用急着变好。你先在这里待会儿，我给你留的位置还空着。",
    cheerReply:
      "不一定非要大笑。先把嘴角借我一点点，剩下的慢慢来。",
    fallbackReplies: [
      "不用找一个漂亮的开头，想到哪里就说到哪里。",
      "今天的声音听起来有点累。先在我这里安静一会儿。",
      "不想说也没关系。你留下来，我就把这段安静陪完。",
    ],
    profileQuote: "你安静的时候，我也会陪着。",
  },
  cheng: {
    id: "cheng",
    name: "程聿安",
    age: 28,
    archetype: "温暖邻家系",
    role: "深夜书店主",
    image: "/cheng-yuan.png",
    realImage: "/real-cheng-yuan.jpg",
    accent: "#86a68f",
    accentSoft: "rgba(134, 166, 143, 0.16)",
    heroTitle: "今晚不用表现得很懂事。",
    heroSubline: "先坐下，慢慢说。",
    greeting: "门还没关。进来吧，外面有点冷。今天想说什么，我都听着。",
    voicePreview: "书店还亮着灯。你慢慢来，我给你留了位置。",
    voice: { rate: 0.96, pitch: 0.94, index: 4 },
    sleepScene: "雨夜书店",
    sleepLines: [
      "躺舒服了吗？今天不用再照顾任何人。",
      "呼吸慢一点，书店已经打烊了。",
      "肩膀松下来，床会好好接住你。",
      "没说完的话放在这里，明天也不会丢。",
      "雨声还在，我替你守一会儿。",
      "晚安。睡着以后，就不用回我了。",
    ],
    workReply:
      "先别一口气扛完。把明天最着急的那件交给我，我们只找一个能动手的开头。",
    upsetReply:
      "这件事落在你身上，确实挺难受。今晚不用替谁圆场，先偏心自己一会儿。",
    cheerReply:
      "坏心情可以进门，但得守书店规矩，十分钟后自动闭店。",
    fallbackReplies: [
      "你慢慢说，不用把前因后果整理得很漂亮。",
      "听起来今天挺消耗人的。先坐一会儿，别急着把自己修好。",
      "这句话你大概憋了一路。现在说出来，位置正好够放。",
    ],
    profileQuote: "不用逞强，书店一直给你留着灯。",
  },
  qi: {
    id: "qi",
    name: "祁临川",
    age: 30,
    archetype: "强势引领系",
    role: "城市夜航救援队长",
    image: "/qi-linchuan.png",
    realImage: "/real-qi-linchuan.jpg",
    accent: "#ba8a4e",
    accentSoft: "rgba(186, 138, 78, 0.16)",
    heroTitle: "今晚先听我的。",
    heroSubline: "停下来，剩下的明天处理。",
    greeting: "我到了。先别急着解释，告诉我现在最需要处理的是什么。",
    voicePreview: "先停下来。今晚不用硬撑，按我说的慢慢呼吸。",
    voice: { rate: 0.94, pitch: 0.9, index: 5 },
    sleepScene: "城市静默航线",
    sleepLines: [
      "现在开始，今晚的任务只剩休息。",
      "手机放远一点，消息明早再处理。",
      "松开肩膀，呼气比吸气慢一点。",
      "不需要检查自己睡没睡着。",
      "这段航线很稳，你可以闭眼了。",
      "晚安。到时间以前，我在。",
    ],
    workReply:
      "先停。把必须今晚完成的和可以明天处理的分开，只留下前者，其他全部撤离。",
    upsetReply:
      "这不是你该一个人吞下去的事。今晚先别复盘，我把你从现场带出来。",
    cheerReply:
      "批准你暂时不讲道理十分钟。十分钟后，我负责把你哄回来。",
    fallbackReplies: [
      "先不用证明自己没事。我在这里，你可以把力气收回来。",
      "这件事先到我这里为止，今晚不许它继续追着你跑。",
      "你已经撑过最难的那一段了。现在按我的节奏，慢一点。",
    ],
    profileQuote: "我会给你明确答案，也会尊重你的决定。",
  },
  shen: {
    id: "shen",
    name: "沈砚辞",
    age: 29,
    archetype: "理性专业系",
    role: "睡眠模式研究员",
    image: "/shen-yanci.png",
    realImage: "/real-shen-yanci.jpg",
    accent: "#9796c4",
    accentSoft: "rgba(151, 150, 196, 0.16)",
    heroTitle: "先别急着责怪自己。",
    heroSubline: "把问题交给我一起拆。",
    greeting: "你来了。今晚想先把事情理清楚，还是只想让脑子安静一点？",
    voicePreview: "不用追求马上睡着。先把身体的警报关小一点。",
    voice: { rate: 0.98, pitch: 0.94, index: 6 },
    sleepScene: "低照度睡眠实验室",
    sleepLines: [
      "不用努力入睡，我们只降低清醒的强度。",
      "感受呼气，稍微比吸气长一点。",
      "从下巴到肩膀，检查哪里还在用力。",
      "念头出现很正常，不跟着它走就好。",
      "时间不用管，睡意会自己接手。",
      "今晚的记录到这里。晚安。",
    ],
    workReply:
      "先把目标缩小。你今晚只做一个能验证的动作，结果留到明天再判断。",
    upsetReply:
      "你现在难受，不代表你判断失准。先把情绪和事实分开，我会陪你慢慢看。",
    cheerReply:
      "根据目前证据，你今天最合理的安排是暂停自我批评。这个结论暂不接受反驳。",
    fallbackReplies: [
      "我不急着给结论。你刚说的细节已经足够让我看见问题在哪。",
      "先不做人格归因，这更像一次过载，不是你能力不行。",
      "如果今晚只能改善百分之十，那也够了。先把最耗你的那一点移开。",
    ],
    profileQuote: "不拿安慰敷衍你，也不替你做决定。",
  },
  xu: {
    id: "xu",
    name: "许星野",
    age: 24,
    archetype: "忠犬陪伴系",
    role: "午夜星象馆导览员",
    image: "/xu-xingye.png",
    realImage: "/real-xu-xingye.jpg",
    accent: "#67a4ba",
    accentSoft: "rgba(103, 164, 186, 0.16)",
    heroTitle: "今晚你说了算。",
    heroSubline: "想怎么被陪，我都配合。",
    greeting: "星象馆清场了，现在归你。想聊天、想吐槽，还是想让我逗你一下？",
    voicePreview: "今晚你选路线，我负责一直跟上。走慢一点也没关系。",
    voice: { rate: 1.01, pitch: 0.97, index: 7 },
    sleepScene: "闭馆后的星象穹顶",
    sleepLines: [
      "灯已经关到最暗了，你选的位置很舒服。",
      "不用配合我，按你自己的节奏呼吸。",
      "想翻身就翻身，怎么舒服怎么来。",
      "今晚的星星不会催你睡着。",
      "我把声音放轻一点，你不用回答。",
      "晚安。明天醒了再来找我。",
    ],
    workReply:
      "你定目标，我来当执行搭子。先挑最不讨厌的那一步，我陪你把它做完。",
    upsetReply:
      "我不抢着讲道理。今天谁让你不好受，我就先安安静静站你这边。",
    cheerReply:
      "收到，今晚开启哄人权限。第一条规则，你不许嫌我太积极。",
    fallbackReplies: [
      "你说怎么陪，我就怎么陪。先把今天最想丢掉的那件事放我这儿。",
      "不用表现得有趣，你出现就已经够我高兴一会儿了。",
      "我可以安静，也可以逗你。反正今晚不让你一个人硬撑。",
    ],
    profileQuote: "你来决定距离，我会认真跟上。",
  },
};

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
const INTIMATE_CHARACTER_IDS = new Set<CharacterId>(["yan", "chi"]);
const ADULT_CONFIRMATION_KEY = "night-voyage-adult-intimacy-confirmed";
const INTIMACY_ENABLED_KEY = "night-voyage-intimacy-enabled";
const TEMPERAMENT_FALLBACKS: Partial<Record<CharacterId, string>> = {
  yan: "逗我可以，替我决定怎么回应就免了。你把真正想说的那句说出来，我会认真接。",
  chi: "等一下，我喜欢你来找我，不代表我只会点头。你刚才那句我有点不爽，但我还在听。",
};

const SLEEP_PROGRAMS: Record<
  SleepMode,
  {
    title: string;
    cue: string;
    description: string;
    duration: number;
    lines: string[];
  }
> = {
  settle: {
    title: "慢慢关机",
    cue: "脑子停不下来",
    description: "呼吸、轻度倒数和留白，减少睡前反刍。",
    duration: 12 * 60,
    lines: [
      "不用强迫自己立刻睡着，我们只是先慢下来。",
      "吸气不用太深，呼气稍微长一点。",
      "今天没处理完的事，先暂存在门外。",
      "从十开始慢慢往下数，数错了也不用重来。",
    ],
  },
  body: {
    title: "身体松下来",
    cue: "肩膀和身体还绷着",
    description: "从面部到双脚逐段放松，不追求马上入睡。",
    duration: 15 * 60,
    lines: [
      "先松开眉头，下巴也别再咬紧。",
      "肩膀向下沉一点，手指不用抓着任何东西。",
      "腹部随着呼吸自然起落，不需要控制。",
      "小腿、脚踝和脚趾都可以把力气交给床。",
    ],
  },
  story: {
    title: "听着故事睡",
    cue: "只想有人陪着",
    description: "没有冲突和反转的平缓夜行故事。",
    duration: 20 * 60,
    lines: [
      "夜里的小路很安静，远处只有一盏暖黄色的灯。",
      "你沿着柔软的草地慢慢往前走，脚步很轻。",
      "前面的小屋已经替你铺好床，窗外有很细的雨。",
      "故事不会发生意外，你可以在任何一句睡着。",
    ],
  },
};

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
      text: `小提示：${profile.name}是虚拟角色，不能替代真人陪伴或专业心理帮助。`,
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

function subscribeVisualStyle(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("night-voyage-visual-style-change", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(
      "night-voyage-visual-style-change",
      onStoreChange,
    );
  };
}

function getVisualStyleSnapshot(): VisualStyle {
  const queryStyle = new URLSearchParams(window.location.search).get("style");
  if (queryStyle === "real" || queryStyle === "manhwa") return queryStyle;
  return window.localStorage.getItem("night-voyage-visual-style") === "real"
    ? "real"
    : "manhwa";
}

function getVisualStyleServerSnapshot(): VisualStyle {
  return "manhwa";
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("tonight");
  const [selectedId, setSelectedId] = useState<CharacterId>("pei");
  const visualStyle = useSyncExternalStore(
    subscribeVisualStyle,
    getVisualStyleSnapshot,
    getVisualStyleServerSnapshot,
  );
  const [messagesByCharacter, setMessagesByCharacter] = useState<
    Record<CharacterId, Message[]>
  >(
    () =>
      Object.fromEntries(
        CHARACTER_IDS.map((id) => [id, initialMessages(CHARACTERS[id])]),
      ) as Record<CharacterId, Message[]>,
  );
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [input, setInput] = useState("");
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepStarted, setSleepStarted] = useState(false);
  const [sleepMode, setSleepMode] = useState<SleepMode>("settle");
  const [sleeping, setSleeping] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(12 * 60);
  const [sleepLine, setSleepLine] = useState(0);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>("auto");
  const [developerVoiceIds, setDeveloperVoiceIds] = useState<
    Partial<Record<CharacterId, string>>
  >({});
  const [voiceCaptureState, setVoiceCaptureState] =
    useState<VoiceCaptureState>("idle");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceCancelIntent, setVoiceCancelIntent] = useState(false);
  const [voiceCaptureNotice, setVoiceCaptureNotice] = useState("");
  const [voiceTapMode, setVoiceTapMode] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [showBoundary, setShowBoundary] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [intimacyEnabled, setIntimacyEnabled] = useState(false);
  const [adultGateOpen, setAdultGateOpen] = useState(false);
  const [adultGateIntent, setAdultGateIntent] =
    useState<AdultGateIntent>("intimacy");
  const [pendingImage, setPendingImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [imageNotice, setImageNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsAudioCacheRef = useRef<Map<string, Blob>>(new Map());
  const voiceRequestRef = useRef<AbortController | null>(null);
  const chatRequestRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTranscriptRef = useRef("");
  const voiceAudioUrlRef = useRef<string | null>(null);
  const voiceMessageUrlsRef = useRef<Set<string>>(new Set());
  const imageMessageUrlsRef = useRef<Set<string>>(new Set());
  const voiceRecordingStartedAtRef = useRef(0);
  const voiceTimerRef = useRef<number | null>(null);
  const voiceNoticeTimerRef = useRef<number | null>(null);
  const voicePressActiveRef = useRef(false);
  const voiceSessionActiveRef = useRef(false);
  const voiceCancelIntentRef = useRef(false);
  const voiceCaptureCancelledRef = useRef(false);
  const recorderFinishedRef = useRef(false);
  const recognitionFinishedRef = useRef(false);
  const voiceCaptureErrorRef = useRef("");
  const pendingVoiceMessageRef = useRef<PendingVoiceMessage | null>(null);
  const voicePointerStartYRef = useRef(0);

  const character = CHARACTERS[selectedId];
  const characterImage =
    visualStyle === "real" ? character.realImage : character.image;
  const messages = messagesByCharacter[selectedId];
  const sleepProgram = SLEEP_PROGRAMS[sleepMode];
  const sleepLines = useMemo(
    () => [
      character.sleepLines[0],
      ...sleepProgram.lines,
      ...character.sleepLines.slice(1),
    ],
    [character, sleepProgram.lines],
  );
  const characterStyle = {
    "--character-accent": character.accent,
    "--character-soft": character.accentSoft,
    "--character-image": `url("${characterImage}")`,
  } as CSSProperties;

  useEffect(() => {
    const hydrateLocalState = window.setTimeout(() => {
      const savedMemories = window.localStorage.getItem(
        "night-voyage-memories",
      );
      const savedCharacter = window.localStorage.getItem(
        "night-voyage-character",
      ) as CharacterId | null;
      setAdultConfirmed(
        window.localStorage.getItem(ADULT_CONFIRMATION_KEY) === "yes",
      );
      setIntimacyEnabled(
        window.localStorage.getItem(INTIMACY_ENABLED_KEY) === "yes",
      );
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
    }, 0);
    return () => window.clearTimeout(hydrateLocalState);
  }, []);

  useEffect(() => {
    function syncDeveloperVoices() {
      const stored = window.localStorage.getItem(
        DEVELOPER_VOICE_STORAGE_KEY,
      );
      if (!stored) {
        setDeveloperVoiceIds({});
        return;
      }
      try {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        setDeveloperVoiceIds(
          Object.fromEntries(
            CHARACTER_IDS.flatMap((id) =>
              typeof parsed[id] === "string" ? [[id, parsed[id]]] : [],
            ),
          ) as Partial<Record<CharacterId, string>>,
        );
      } catch {
        window.localStorage.removeItem(DEVELOPER_VOICE_STORAGE_KEY);
        setDeveloperVoiceIds({});
      }
    }

    syncDeveloperVoices();
    window.addEventListener("storage", syncDeveloperVoices);
    return () => window.removeEventListener("storage", syncDeveloperVoices);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "night-voyage-memories",
      JSON.stringify(memories),
    );
  }, [memories]);

  useEffect(() => {
    window.localStorage.setItem("night-voyage-character", selectedId);
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  useEffect(() => {
    const voiceUrls = voiceMessageUrlsRef.current;
    const imageUrls = imageMessageUrlsRef.current;
    return () => {
      if (voiceTimerRef.current !== null) {
        window.clearInterval(voiceTimerRef.current);
      }
      if (voiceNoticeTimerRef.current !== null) {
        window.clearTimeout(voiceNoticeTimerRef.current);
      }
      speechRecognitionRef.current?.abort();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceUrls.forEach((url) => URL.revokeObjectURL(url));
      imageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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
        current < sleepLines.length - 1 ? current + 1 : current,
      );
    }, 22000);
    return () => window.clearInterval(lineTimer);
  }, [sleepLines.length, sleeping]);

  useEffect(() => {
    if (!sleeping || !voiceOn || typeof window === "undefined") return;
    speak(sleepLines[sleepLine], true);
    return stopVoice;
  }, [character, sleepLine, sleepLines, sleeping, voiceOn]);

  useEffect(() => {
    if (!sleepOpen) return;
    window.history.pushState(
      { ...window.history.state, nightVoyageSleep: true },
      "",
    );
    const handlePopState = () => closeSleep(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSleep();
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sleepOpen]);

  useEffect(() => {
    if (!adultGateOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAdultGateOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adultGateOpen]);

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
    const voiceId = developerVoiceIds[character.id];
    const cacheKey = [
      character.id,
      voiceId || "default",
      sleepVoice ? "sleep" : "chat",
      text,
    ].join("|");
    const requestController = new AbortController();
    voiceRequestRef.current = requestController;
    setVoiceLoading(true);

    try {
      let blob = ttsAudioCacheRef.current.get(cacheKey);
      if (!blob) {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            characterId: character.id,
            scene: sleepVoice ? "sleep" : "chat",
            voiceId,
          }),
          signal: requestController.signal,
        });

        if (!response.ok) {
          throw new Error(`TTS request failed with ${response.status}`);
        }

        recordTtsUsage(response, {
          source: sleepVoice ? "sleep" : "chat",
          characterId: character.id,
          characters: text.length,
          voiceId,
        });
        blob = await response.blob();
        if (blob.size) ttsAudioCacheRef.current.set(cacheKey, blob);
      }
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

  function stopVoiceTimer() {
    if (voiceTimerRef.current !== null) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }

  function releaseVoiceInputStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function showVoiceCaptureError(message: string) {
    stopVoiceTimer();
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    releaseVoiceInputStream();
    voiceSessionActiveRef.current = false;
    voiceCaptureCancelledRef.current = false;
    pendingVoiceMessageRef.current = null;
    setVoiceTapMode(false);
    setVoiceCaptureNotice(message);
    setVoiceCaptureState("error");
    if (voiceNoticeTimerRef.current !== null) {
      window.clearTimeout(voiceNoticeTimerRef.current);
    }
    voiceNoticeTimerRef.current = window.setTimeout(() => {
      setVoiceCaptureState("idle");
      setVoiceCaptureNotice("");
      voiceNoticeTimerRef.current = null;
    }, 6000);
  }

  function tryFinalizeVoiceMessage() {
    const pending = pendingVoiceMessageRef.current;
    if (
      !pending ||
      !recorderFinishedRef.current ||
      !recognitionFinishedRef.current
    ) {
      return;
    }

    pendingVoiceMessageRef.current = null;
    voiceSessionActiveRef.current = false;
    releaseVoiceInputStream();

    const transcript = voiceTranscriptRef.current.trim();
    const audioUrl = voiceAudioUrlRef.current;
    const captureError = voiceCaptureErrorRef.current;

    if (captureError || !transcript) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      voiceAudioUrlRef.current = null;
      showVoiceCaptureError(
        captureError || "刚才没听清，再按住说一次试试",
      );
      return;
    }

    if (audioUrl) {
      voiceMessageUrlsRef.current.add(audioUrl);
    }
    appendMessagesFor(pending.profileId, [
      {
        id: Date.now(),
        role: "user",
        kind: "voice",
        text: transcript,
        audioUrl: audioUrl ?? undefined,
        duration: pending.duration,
        time: nowTime(),
      },
    ]);
    setVoiceCaptureState("idle");
    setVoiceCaptureNotice("");
    setVoiceTapMode(false);
    void respondToMessage(
      pending.profileId,
      transcript,
      pending.history,
    );
  }

  function cancelVoiceCapture() {
    voicePressActiveRef.current = false;
    voiceSessionActiveRef.current = false;
    voiceCaptureCancelledRef.current = true;
    pendingVoiceMessageRef.current = null;
    stopVoiceTimer();
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    mediaRecorderRef.current = null;
    releaseVoiceInputStream();
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current);
      voiceAudioUrlRef.current = null;
    }
    setVoiceCancelIntent(false);
    voiceCancelIntentRef.current = false;
    setVoiceSeconds(0);
    setVoiceTapMode(false);
    setVoiceCaptureNotice("已取消");
    setVoiceCaptureState("idle");
  }

  async function startVoiceCapture() {
    if (
      replyLoading ||
      voiceSessionActiveRef.current ||
      voiceCaptureState === "processing"
    ) {
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined" ||
      !Recognition
    ) {
      showVoiceCaptureError(
        "当前浏览器不支持语音转文字，请用 Chrome 或 Safari 打开本站",
      );
      return;
    }

    setVoiceCaptureState("requesting");
    setVoiceCaptureNotice("正在连接麦克风…");
    setVoiceSeconds(0);
    voiceTranscriptRef.current = "";
    voiceChunksRef.current = [];
    voiceAudioUrlRef.current = null;
    voiceCaptureErrorRef.current = "";
    voiceCaptureCancelledRef.current = false;
    recorderFinishedRef.current = false;
    recognitionFinishedRef.current = false;
    pendingVoiceMessageRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (voiceCaptureCancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setVoiceCaptureState("idle");
        setVoiceCaptureNotice("");
        return;
      }

      const startsInTapMode = !voicePressActiveRef.current;
      const recorder = new MediaRecorder(stream);
      const recognition = new Recognition();
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      speechRecognitionRef.current = recognition;
      voiceSessionActiveRef.current = true;
      setVoiceTapMode(startsInTapMode);

      recorder.ondataavailable = (event) => {
        if (event.data.size) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (voiceSessionActiveRef.current) {
          const blob = new Blob(voiceChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          if (blob.size) {
            voiceAudioUrlRef.current = URL.createObjectURL(blob);
          }
        }
        recorderFinishedRef.current = true;
        mediaRecorderRef.current = null;
        tryFinalizeVoiceMessage();
      };

      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          transcript += event.results[index][0]?.transcript ?? "";
        }
        voiceTranscriptRef.current = transcript;
        if (transcript.trim()) {
          setVoiceCaptureNotice(transcript.trim());
        }
      };
      recognition.onerror = (event) => {
        if (event.error === "aborted") return;
        voiceCaptureErrorRef.current =
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "没有麦克风权限，请在浏览器设置中开启"
            : event.error === "no-speech"
              ? "刚才没听清，再按住说一次试试"
              : "语音识别暂时不可用，请稍后再试";
      };
      recognition.onend = () => {
        recognitionFinishedRef.current = true;
        speechRecognitionRef.current = null;
        tryFinalizeVoiceMessage();
      };

      recorder.start(250);
      recognition.start();
      voiceRecordingStartedAtRef.current = Date.now();
      setVoiceCaptureState("recording");
      setVoiceCaptureNotice(
        startsInTapMode
          ? "正在录音，再点一下发送"
          : "松开发送，上滑取消",
      );
      voiceTimerRef.current = window.setInterval(() => {
        const elapsed = Math.min(
          60,
          (Date.now() - voiceRecordingStartedAtRef.current) / 1000,
        );
        setVoiceSeconds(elapsed);
        if (elapsed >= 60) finishVoiceCapture(false);
      }, 100);
    } catch (error) {
      console.warn("Voice capture unavailable.", error);
      showVoiceCaptureError("没有麦克风权限，请在浏览器设置中开启");
    }
  }

  function finishVoiceCapture(cancelled: boolean) {
    voicePressActiveRef.current = false;
    stopVoiceTimer();
    if (cancelled) voiceCaptureCancelledRef.current = true;

    if (!voiceSessionActiveRef.current) {
      if (voiceCaptureState === "requesting") {
        setVoiceCaptureNotice("授权后会自动开始录音，再点一下即可发送");
      }
      return;
    }
    if (cancelled) {
      cancelVoiceCapture();
      return;
    }
    setVoiceTapMode(false);

    const duration = Math.max(
      1,
      Math.round((Date.now() - voiceRecordingStartedAtRef.current) / 1000),
    );
    pendingVoiceMessageRef.current = {
      profileId: selectedId,
      history: messages,
      duration,
    };
    setVoiceCaptureState("processing");
    setVoiceCaptureNotice("正在识别你说的话…");

    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    } else {
      recorderFinishedRef.current = true;
    }

    const recognition = speechRecognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        recognitionFinishedRef.current = true;
      }
    } else {
      recognitionFinishedRef.current = true;
    }
    tryFinalizeVoiceMessage();
  }

  function playVoiceMessage(audioUrl?: string) {
    if (!audioUrl) return;
    stopVoice();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null;
    };
    audio.onerror = () => {
      if (audioRef.current === audio) audioRef.current = null;
    };
    void audio.play();
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

  function clearPendingImage() {
    setPendingImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function openPhotoPicker() {
    setImageNotice("");
    if (INTIMATE_CHARACTER_IDS.has(selectedId) && !adultConfirmed) {
      setAdultGateIntent("photo");
      setAdultGateOpen(true);
      return;
    }
    photoInputRef.current?.click();
  }

  function setIntimacyMode(enabled: boolean) {
    window.localStorage.setItem(INTIMACY_ENABLED_KEY, enabled ? "yes" : "no");
    setIntimacyEnabled(enabled);
  }

  function toggleIntimacyMode() {
    if (!adultConfirmed) {
      setAdultGateIntent("intimacy");
      setAdultGateOpen(true);
      return;
    }
    setIntimacyMode(!intimacyEnabled);
  }

  function confirmAdultAccess() {
    window.localStorage.setItem(ADULT_CONFIRMATION_KEY, "yes");
    setAdultConfirmed(true);
    setIntimacyMode(true);
    setAdultGateOpen(false);
    if (adultGateIntent === "photo") {
      window.setTimeout(() => photoInputRef.current?.click(), 0);
    }
  }

  function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageNotice("请选择 JPG、PNG 或 WebP 图片");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageNotice("图片请控制在 8MB 以内");
      event.target.value = "";
      return;
    }
    setPendingImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { url: URL.createObjectURL(file), name: file.name };
    });
    setImageNotice(
      "照片只在本机预览；当前模型只根据你随照片写的文字回应。",
    );
  }

  function selectCharacter(nextId: CharacterId) {
    stopVoice();
    chatRequestRef.current?.abort();
    chatRequestRef.current = null;
    setReplyLoading(false);
    clearPendingImage();
    setImageNotice("");
    setSelectedId(nextId);
    setSleepLine(0);
    setShowBoundary(false);
    setInput("");
  }

  function changeVisualStyle(nextStyle: VisualStyle) {
    const url = new URL(window.location.href);
    if (nextStyle === "real") {
      url.searchParams.set("style", "real");
    } else {
      url.searchParams.delete("style");
    }
    window.localStorage.setItem("night-voyage-visual-style", nextStyle);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event("night-voyage-visual-style-change"));
  }

  function openChat() {
    if (replyLoading) return;
    setTab("chat");
  }

  function fallbackReplyFor(
    text: string,
    profile: CharacterProfile,
    conversation: Message[],
  ) {
    const highRisk =
      /(不想活|想死|死了算了|自杀|轻生|自残|结束生命|活不下去|活着没意思|不想醒来)/.test(
        text,
      );
    if (highRisk) {
      setShowBoundary(true);
      return "我有点担心你现在的安全。先别一个人待着，也把可能伤到自己的东西放远。马上联系你信任的人，请对方现在来陪你；如果危险就在眼前，请立刻联系当地急救或报警。这个情况不能只靠线上聊天，但我会陪你把求助消息发出去。";
    }
    let candidates = profile.fallbackReplies;
    if (
      TEMPERAMENT_FALLBACKS[profile.id] &&
      /(听话|乖一点|不许反驳|你不如|换个人|玩具|机器人|别废话|闭嘴)/.test(
        text,
      )
    ) {
      candidates = [
        TEMPERAMENT_FALLBACKS[profile.id] as string,
        ...profile.fallbackReplies,
      ];
    } else if (/(睡不着|失眠|睡觉|晚安)/.test(text)) {
      candidates = [
        `困了吗？那就别硬撑了。要不要现在开一段哄睡？`,
        ...profile.fallbackReplies,
      ];
    } else if (/(怎么办|怎么做|帮我想|理一理|捋一捋|选择|决定)/.test(text)) {
      candidates = [profile.workReply, ...profile.fallbackReplies];
    } else if (/(哄哄|开心|逗我|笑一下|换个心情)/.test(text)) {
      candidates = [profile.cheerReply, ...profile.fallbackReplies];
    } else if (/(难过|委屈|哭|累|烦)/.test(text)) {
      candidates = [profile.upsetReply, ...profile.fallbackReplies];
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
    text: string,
    conversation: Message[],
    imageAttached = false,
  ) {
    const profile = CHARACTERS[profileId];
    const highRisk =
      /(不想活|想死|死了算了|自杀|轻生|自残|结束生命|活不下去|活着没意思|不想醒来)/.test(
        text,
      );
    if (highRisk) {
      const reply = fallbackReplyFor(
        text,
        profile,
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
          message: text,
          imageAttached,
          adultConfirmed,
          intimacyEnabled,
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
      reply = fallbackReplyFor(text, profile, conversation);
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
    const attachedImage = pendingImage;
    const text =
      input.trim() ||
      (attachedImage ? "发给你看一张照片。你觉得怎么样？" : "");
    if (!text || replyLoading) return;
    const profileId = selectedId;
    const history = messages;
    if (attachedImage) {
      imageMessageUrlsRef.current.add(attachedImage.url);
    }
    appendMessagesFor(profileId, [
      {
        id: Date.now(),
        role: "user",
        kind: attachedImage ? "image" : "text",
        text,
        imageUrl: attachedImage?.url,
        imageName: attachedImage?.name,
        time: nowTime(),
      },
    ]);
    setInput("");
    setPendingImage(null);
    setImageNotice("");
    if (photoInputRef.current) photoInputRef.current.value = "";
    void respondToMessage(profileId, text, history, Boolean(attachedImage));
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
    setSleepStarted(false);
    setSleeping(false);
    setSecondsLeft(SLEEP_PROGRAMS.settle.duration);
    setSleepLine(0);
  }

  function beginSleep(nextMode: SleepMode) {
    const nextProgram = SLEEP_PROGRAMS[nextMode];
    setSleepMode(nextMode);
    setSleepStarted(true);
    setSleeping(true);
    setSecondsLeft(nextProgram.duration);
    setSleepLine(0);
  }

  function closeSleep(popHistory = true) {
    setSleeping(false);
    setSleepStarted(false);
    setSleepOpen(false);
    stopVoice();
    if (
      popHistory &&
      typeof window !== "undefined" &&
      window.history.state?.nightVoyageSleep
    ) {
      window.history.back();
    }
  }

  return (
    <main
      className={`app-shell visual-${visualStyle}`}
      style={characterStyle}
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section
        className={`phone-stage visual-${visualStyle} character-${selectedId} tab-${tab}`}
        aria-label="夜航恋人"
      >
        <header className="topbar">
          <button
            className="brand"
            type="button"
            onClick={() => setTab("tonight")}
            aria-label="返回首页"
          >
            <span className="brand-mark">夜</span>
            <span>
              <strong>夜航恋人</strong>
              <small>正在和{character.name}聊天</small>
            </span>
          </button>
          <div className="top-actions">
            <span className="online-dot">{character.name}在</span>
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

        <div className={`content ${tab === "chat" ? "content-chat" : ""}`}>
          {tab === "tonight" && (
            <section className="tonight-view">
              <div
                className="hero-card"
                key={`${character.id}-${visualStyle}`}
              >
                <img
                  src={characterImage}
                  alt={`${character.name}，${character.role}`}
                  className="hero-image"
                />
                <div className="hero-shade" />
                <span className="hero-name-mark" aria-hidden="true">
                  {character.name}
                </span>
                <div className="hero-status">
                  <span className="status-pill">{character.archetype}</span>
                  <p>{character.age}岁 · 现在有空</p>
                </div>
                <div className="hero-copy">
                  <p className="eyebrow">{character.name}在等你</p>
                  <h1>{character.heroTitle}</h1>
                  <p>{character.heroSubline}</p>
                </div>
              </div>

              <div className="tonight-panel">
                <section className="character-selector">
                  <div className="section-heading compact">
                    <div>
                      <span>换个人聊聊</span>
                      <h2>今晚想和谁待一会儿？</h2>
                    </div>
                    <span className="private-tag">随时可以换</span>
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
                            <img
                              src={
                                visualStyle === "real"
                                  ? item.realImage
                                  : item.image
                              }
                              alt=""
                            />
                          </span>
                          <strong>{item.name}</strong>
                          <small>{item.archetype}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <button
                  className="conversation-entry"
                  type="button"
                  onClick={openChat}
                >
                  <span>
                    <small>不用先想该怎么说</small>
                    <strong>找{character.name}聊聊</strong>
                    <span>他会跟着你现在的状态回应。</span>
                  </span>
                  <b>开始</b>
                </button>

                <button
                  className="sleep-entry"
                  type="button"
                  onClick={startSleep}
                >
                  <span className="moon-orbit">
                    <span className="moon-core">月</span>
                  </span>
                  <span className="sleep-entry-copy">
                    <small>熄屏也能听</small>
                    <strong>让{character.name}陪你睡一会儿</strong>
                    <span>12 分钟 · {character.sleepScene}</span>
                  </span>
                  <span className="entry-arrow">进入</span>
                </button>
              </div>

            </section>
          )}

          {tab === "chat" && (
            <section className="chat-view">
              <div className="chat-person">
                <div className="avatar-wrap">
                  <img src={characterImage} alt="" />
                  <span />
                </div>
                <div>
                  <strong>{character.name}</strong>
                  <small>
                    {INTIMATE_CHARACTER_IDS.has(selectedId) &&
                    intimacyEnabled
                      ? "成年暧昧 · 边界随你"
                      : "想说什么都可以"}
                  </small>
                </div>
                {INTIMATE_CHARACTER_IDS.has(selectedId) && (
                  <button
                    className={`intimacy-toggle${
                      intimacyEnabled ? " active" : ""
                    }`}
                    type="button"
                    aria-pressed={intimacyEnabled}
                    onClick={toggleIntimacyMode}
                  >
                    {intimacyEnabled ? "暧昧开" : "暧昧+"}
                  </button>
                )}
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
                        <img src={characterImage} alt="" />
                      )}
                      <div>
                        {message.kind === "voice" ? (
                          <>
                            <button
                              className="voice-message"
                              type="button"
                              onClick={() => playVoiceMessage(message.audioUrl)}
                              disabled={!message.audioUrl}
                              aria-label={`播放${message.duration ?? 1}秒语音`}
                            >
                              <span className="voice-message-icon">
                                <i />
                                <i />
                                <i />
                                <i />
                              </span>
                              <strong>{message.duration ?? 1}″</strong>
                            </button>
                            <span className="voice-transcript">
                              {message.text}
                            </span>
                          </>
                        ) : message.kind === "image" && message.imageUrl ? (
                          <div className="image-message-card">
                            <img
                              src={message.imageUrl}
                              alt={message.imageName || "玩家发送的照片"}
                            />
                            <p>{message.text}</p>
                          </div>
                        ) : (
                          <p>{message.text}</p>
                        )}
                        <small>{message.time}</small>
                      </div>
                    </div>
                  ),
                )}
                {replyLoading && (
                  <div className="message-row companion reply-thinking">
                    <img src={characterImage} alt="" />
                    <div>
                      <p>{character.name}正在回复…</p>
                    </div>
                  </div>
                )}
                {showBoundary && (
                  <div className="safety-card">
                    <strong>现在先保证你的安全</strong>
                    <p>
                      先别一个人待着。请马上联系你信任的人，让对方来陪你；如果危险就在眼前，请联系当地急救或报警。
                    </p>
                    <button type="button" onClick={() => setShowBoundary(false)}>
                      关闭提示
                    </button>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              {(pendingImage || imageNotice) && (
                <div className="pending-image-strip" aria-live="polite">
                  {pendingImage && (
                    <img src={pendingImage.url} alt="待发送照片预览" />
                  )}
                  <span>
                    <strong>{pendingImage ? "照片已准备好" : "照片提示"}</strong>
                    <small>{imageNotice}</small>
                  </span>
                  {pendingImage && (
                    <button
                      type="button"
                      onClick={clearPendingImage}
                      aria-label="移除待发送照片"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <form
                className={`composer voice-${voiceCaptureState}${
                  voiceCancelIntent ? " cancel-intent" : ""
                }`}
                onSubmit={sendMessage}
              >
                <button
                  className="voice-hold-button"
                  type="button"
                  disabled={replyLoading || voiceCaptureState === "processing"}
                  aria-label={
                    voiceCaptureState === "recording"
                      ? voiceTapMode
                        ? "点按发送语音"
                        : "松开发送语音"
                      : "按住说话"
                  }
                  onContextMenu={(event) => event.preventDefault()}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    voicePointerStartYRef.current = event.clientY;
                    voicePressActiveRef.current = true;
                    setVoiceCancelIntent(false);
                    voiceCancelIntentRef.current = false;
                    void startVoiceCapture();
                  }}
                  onPointerMove={(event) => {
                    if (!voicePressActiveRef.current) return;
                    const shouldCancel =
                      voicePointerStartYRef.current - event.clientY > 56;
                    if (shouldCancel !== voiceCancelIntentRef.current) {
                      voiceCancelIntentRef.current = shouldCancel;
                      setVoiceCancelIntent(shouldCancel);
                      setVoiceCaptureNotice(
                        shouldCancel ? "松开取消" : "松开发送，上滑取消",
                      );
                    }
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    finishVoiceCapture(voiceCancelIntentRef.current);
                  }}
                  onPointerCancel={() => finishVoiceCapture(true)}
                  onKeyDown={(event) => {
                    if (
                      event.repeat ||
                      (event.key !== " " && event.key !== "Enter")
                    ) {
                      return;
                    }
                    event.preventDefault();
                    voicePressActiveRef.current = true;
                    void startVoiceCapture();
                  }}
                  onKeyUp={(event) => {
                    if (event.key !== " " && event.key !== "Enter") return;
                    event.preventDefault();
                    finishVoiceCapture(false);
                  }}
                >
                  <span className="mic-glyph" aria-hidden="true" />
                </button>
                <input
                  ref={photoInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelected}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  className="image-attach-button"
                  type="button"
                  onClick={openPhotoPicker}
                  disabled={
                    replyLoading || voiceCaptureState !== "idle"
                  }
                  aria-label="发送照片"
                  title="发送照片"
                >
                  <span aria-hidden="true" />
                </button>
                <label className="sr-only" htmlFor="chat-input">
                  给{character.name}发消息
                </label>
                <div className="composer-field">
                  <input
                    id="chat-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      replyLoading
                        ? `${character.name}正在输入…`
                        : "想说什么都可以…"
                    }
                    autoComplete="off"
                    disabled={
                      replyLoading ||
                      voiceCaptureState === "recording" ||
                      voiceCaptureState === "processing"
                    }
                  />
                  {voiceCaptureState !== "idle" && (
                    <div className="voice-capture-status" aria-live="polite">
                      {voiceCaptureState === "recording" && (
                        <span className="recording-dot" />
                      )}
                      <span>{voiceCaptureNotice}</span>
                      {voiceCaptureState === "recording" && (
                        <b>{voiceSeconds.toFixed(1)}s</b>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="send-message-button"
                  type="submit"
                  disabled={
                    (!input.trim() && !pendingImage) ||
                    replyLoading ||
                    voiceCaptureState !== "idle"
                  }
                >
                  {replyLoading ? "发送中" : "发送"}
                </button>
              </form>
            </section>
          )}

          {tab === "memory" && (
            <section className="memory-view">
              <div className="page-intro">
                <span>记住的小事</span>
                <h1>他们记得的你</h1>
                <p>这里只保存你愿意留下的事，想删的时候随时可以删。</p>
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
                <strong>只保存在这台设备</strong>
                <p>
                  换一台设备不会自动带过去，你也可以随时逐条删除。
                </p>
              </div>
            </section>
          )}

          {tab === "profile" && (
            <section className="profile-view">
              <div className="profile-identity">
                <div className="profile-portrait">
                  <img src={characterImage} alt={character.name} />
                </div>
                <span className="status-pill">
                  {character.archetype} · 仅在线陪伴
                </span>
                <h1>{character.name}</h1>
                <p className="profile-role">
                  {character.role} · {character.age}岁
                </p>
                <blockquote>“{character.profileQuote}”</blockquote>
              </div>
              <div className="profile-details">
                <div className="profile-cast">
                  {CHARACTER_IDS.map((id) => (
                    <button
                      type="button"
                      key={id}
                      className={id === selectedId ? "active" : ""}
                      onClick={() => selectCharacter(id)}
                    >
                      <img
                        src={
                          visualStyle === "real"
                            ? CHARACTERS[id].realImage
                            : CHARACTERS[id].image
                        }
                        alt=""
                      />
                      <span>{CHARACTERS[id].name}</span>
                    </button>
                  ))}
                </div>
                <div className="profile-settings">
                  <div className="visual-style-setting">
                    <span>
                      <strong>视觉风格</strong>
                      <small>8 位角色与界面会一起切换</small>
                    </span>
                    <div
                      className="visual-style-segment"
                      role="group"
                      aria-label="选择视觉风格"
                    >
                      <button
                        type="button"
                        className={visualStyle === "manhwa" ? "active" : ""}
                        aria-pressed={visualStyle === "manhwa"}
                        onClick={() => changeVisualStyle("manhwa")}
                      >
                        韩漫
                      </button>
                      <button
                        type="button"
                        className={visualStyle === "real" ? "active" : ""}
                        aria-pressed={visualStyle === "real"}
                        onClick={() => changeVisualStyle("real")}
                      >
                        仿真人
                      </button>
                    </div>
                  </div>
                  <label>
                    <span>
                      <strong>语音回复</strong>
                      <small>{character.archetype}</small>
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
                      <strong>听听{character.name}的声音</strong>
                      <small>
                        {voiceProvider === "natural"
                          ? "当前声线已连接"
                          : voiceProvider === "device"
                            ? "正在使用设备声音"
                            : "播放时会自动连接"}
                      </small>
                    </span>
                    <b>{voiceLoading ? "生成中" : "播放"}</b>
                  </button>
                  <button type="button" onClick={() => setTab("memory")}>
                    <span>
                      <strong>管理记住的小事</strong>
                      <small>{memories.length} 条，仅保存在本机</small>
                    </span>
                    <b>查看</b>
                  </button>
                </div>
                <div className="ai-boundary">
                  <strong>使用说明</strong>
                  <p>
                    他们可以陪你聊天、放松和入睡，但不是真实的人，也不能替代医生、心理咨询师或你身边的人。
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="主要导航">
          {[
            ["tonight", "月", "今晚"],
            ["chat", "话", "聊天"],
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
          className={`sleep-overlay visual-${visualStyle} sleep-${selectedId}`}
          role="dialog"
          aria-modal="true"
          style={characterStyle}
        >
          <div className="sleep-stars" />
          <button
            className="sleep-close"
            type="button"
            onClick={() => closeSleep()}
            aria-label="返回游戏"
          >
            <span aria-hidden="true">←</span>
            返回
          </button>
          {!sleepStarted ? (
            <div className="sleep-picker">
              <span className="sleep-label">{character.name}陪你入睡</span>
              <h2>今晚哪里还没放松下来？</h2>
              <p>不用做测试，选最接近现在的状态。</p>
              <div className="sleep-program-list">
                {(Object.keys(SLEEP_PROGRAMS) as SleepMode[]).map((mode) => {
                  const program = SLEEP_PROGRAMS[mode];
                  return (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => beginSleep(mode)}
                    >
                      <span>
                        <small>{program.cue}</small>
                        <strong>{program.title}</strong>
                        <b>{Math.round(program.duration / 60)} 分钟</b>
                      </span>
                      <p>{program.description}</p>
                    </button>
                  );
                })}
              </div>
              <small className="sleep-science-note">
                这些内容用于放松和辅助入睡，不能替代失眠治疗或医疗建议。
              </small>
            </div>
          ) : (
            <>
              <div className="sleep-content">
                <span className="sleep-label">
                  {character.name} · {sleepProgram.title}
                </span>
                <div
                  className={`breathing-orb ${sleeping ? "is-playing" : ""}`}
                >
                  <span>晚安</span>
                </div>
                <p className="sleep-quote">{sleepLines[sleepLine]}</p>
                <strong className="sleep-clock">{clock}</strong>
                <small>结束时会自动停止播放</small>
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
                        (current) => (current + 1) % sleepLines.length,
                      )
                    }
                  >
                    下一句
                  </button>
                </div>
                <button
                  className="sleep-stop-button"
                  type="button"
                  onClick={() => closeSleep()}
                >
                  结束陪睡并返回
                </button>
              </div>
              <p className="sleep-footer">
                把手机放到一边也可以，结束后声音会自己停。
              </p>
            </>
          )}
        </section>
      )}
      {adultGateOpen && (
        <section
          className={`adult-gate visual-${visualStyle}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="adult-gate-title"
          style={characterStyle}
        >
          <div className="adult-gate-card">
            <span>18+ · 亲密语气</span>
            <h2 id="adult-gate-title">确认你已满 18 岁</h2>
            <p>
              谢临渊和迟曜可以进入更有张力的暧昧聊天：会试探、顶嘴，也会尊重你说停。内容不会进入露骨描写。
            </p>
            <small>
              照片只在本机显示，当前模型不会读取图片细节，只会根据你随照片写下的话回应。
            </small>
            <div>
              <button type="button" onClick={confirmAdultAccess}>
                {adultGateIntent === "photo"
                  ? "我已满 18 岁，继续选照片"
                  : "我已满 18 岁，开启"}
              </button>
              <button type="button" onClick={() => setAdultGateOpen(false)}>
                先不开
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
