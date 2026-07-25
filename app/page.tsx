"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Tab = "tonight" | "chat" | "memory" | "profile";
type ComfortMode = "listen" | "untangle" | "cheer";
type Message = {
  id: number;
  role: "pei" | "user" | "system";
  text: string;
  time: string;
};
type Memory = {
  id: number;
  text: string;
  date: string;
};

const INITIAL_MEMORIES: Memory[] = [
  { id: 1, text: "你喜欢雨声，但不喜欢突然的雷声。", date: "今晚" },
  { id: 2, text: "睡不着时，比起建议，你更想先被好好听完。", date: "今晚" },
  { id: 3, text: "你希望我叫你“小朋友”。", date: "初次见面" },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "pei",
    text: "晚上好，小朋友。今天不用表现得很好，回来就够了。",
    time: "22:18",
  },
  {
    id: 2,
    role: "system",
    text: "裴叙白是虚拟角色，所有回应由人工智能生成，并非真人或心理治疗服务。",
    time: "",
  },
];

const MODE_COPY: Record<
  ComfortMode,
  { label: string; short: string; prompt: string; reply: string }
> = {
  listen: {
    label: "抱抱我",
    short: "先听我说",
    prompt: "今晚我不想解决问题，只想有人听。",
    reply:
      "好。你慢慢说，我不急着替你下结论。今天最让你觉得委屈的，是哪一个瞬间？",
  },
  untangle: {
    label: "陪我理清",
    short: "一起想办法",
    prompt: "我脑子有点乱，陪我把事情理清吧。",
    reply:
      "我们一次只看一件事。先告诉我：现在最担心的是什么，明天最先需要处理的又是什么？",
  },
  cheer: {
    label: "逗我开心",
    short: "换换心情",
    prompt: "今天太累了，想让你哄我开心。",
    reply:
      "批准。今晚你负责把眉头松开，我负责把糟糕的一天从你手里接走。先选：冷笑话，还是三十秒夸夸？",
  },
};

const SLEEP_LINES = [
  "把今天最放不下的事，先留在这里。",
  "不用现在解决。床很稳，房间也很安静。",
  "慢慢放松眉心，再放松肩膀。",
  "呼吸不需要很标准，只要比刚才更轻一点。",
  "今晚已经够辛苦了，剩下的交给明天。",
  "不用回答。我会把灯关掉。",
];

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
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [input, setInput] = useState("");
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(12 * 60);
  const [sleepLine, setSleepLine] = useState(0);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [showBoundary, setShowBoundary] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("night-voyage-memories");
    if (saved) {
      try {
        setMemories(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("night-voyage-memories");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "night-voyage-memories",
      JSON.stringify(memories),
    );
  }, [memories]);

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
        current < SLEEP_LINES.length - 1 ? current + 1 : current,
      );
    }, 22000);
    return () => window.clearInterval(lineTimer);
  }, [sleeping]);

  useEffect(() => {
    if (!sleeping || !voiceOn || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const phrase = new SpeechSynthesisUtterance(SLEEP_LINES[sleepLine]);
    phrase.lang = "zh-CN";
    phrase.rate = 0.72;
    phrase.pitch = 0.82;
    phrase.volume = 0.72;
    window.speechSynthesis.speak(phrase);
    return () => window.speechSynthesis.cancel();
  }, [sleepLine, sleeping, voiceOn]);

  const clock = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  function speak(text: string) {
    if (!voiceOn || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const phrase = new SpeechSynthesisUtterance(text);
    phrase.lang = "zh-CN";
    phrase.rate = 0.86;
    phrase.pitch = 0.86;
    window.speechSynthesis.speak(phrase);
  }

  function chooseMode(nextMode: ComfortMode) {
    setMode(nextMode);
    setTab("chat");
    const copy = MODE_COPY[nextMode];
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: copy.prompt,
      time: nowTime(),
    };
    setMessages((current) => [...current, userMessage]);
    window.setTimeout(() => {
      const response: Message = {
        id: Date.now() + 1,
        role: "pei",
        text: copy.reply,
        time: nowTime(),
      };
      setMessages((current) => [...current, response]);
      speak(copy.reply);
    }, 550);
  }

  function replyFor(text: string) {
    const highRisk = /(不想活|自杀|自残|结束生命|活不下去)/.test(text);
    if (highRisk) {
      setShowBoundary(true);
      return "我很在意你现在的安全。先不要一个人待着，也不要伤害自己。请立刻联系你信任的人，让对方来到你身边；如果危险就在眼前，请联系当地紧急服务。我是虚拟角色，不能替代现实中的紧急帮助，但我可以陪你把求助这一步做完。";
    }
    if (/(睡不着|失眠|睡觉|晚安)/.test(text)) {
      return "那今晚不继续想答案了。把声音留给我，你只需要找一个舒服的姿势。要现在进入睡眠陪伴吗？";
    }
    if (/(老板|工作|加班|同事)/.test(text)) {
      return mode === "untangle"
        ? "先把事实和感受分开：发生了什么、最让你难受的是什么、明天最小的一步是什么？我们一项项来。"
        : "你撑着处理完那些事，回到这里才敢说累。辛苦不是你的错。现在先靠一会儿，不急着证明什么。";
    }
    if (/(难过|委屈|哭|累|烦)/.test(text)) {
      return mode === "cheer"
        ? "那我先替今天的你颁个奖：明明已经这么累，还是把一天好好走完了。奖品是今晚可以什么都不逞强。"
        : "我听见了。你不用把难过讲得很有道理，我也会认真接住。愿意告诉我，是哪一刻开始觉得撑不住的吗？";
    }
    return mode === "listen"
      ? "嗯，我在听。你可以再多说一点，不需要把语言整理得很漂亮。"
      : mode === "untangle"
        ? "我大概明白了。我们先不处理全部，只找出现在最影响你的那一件事，好吗？"
        : "收到。今晚禁止你一个人偷偷皱眉——至少要分我一半。";
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text,
      time: nowTime(),
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    window.setTimeout(() => {
      const reply = replyFor(text);
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "pei", text: reply, time: nowTime() },
      ]);
      speak(reply);
    }, 650);
  }

  function addMemory(event: FormEvent) {
    event.preventDefault();
    const text = memoryDraft.trim();
    if (!text) return;
    setMemories((current) => [
      { id: Date.now(), text, date: "刚刚" },
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
    window.speechSynthesis?.cancel();
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="phone-stage" aria-label="夜航恋人应用原型">
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
            <span className="online-dot">在线</span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setVoiceOn((current) => !current)}
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
              <div className="hero-card">
                <img
                  src="/pei-xubai.png"
                  alt="裴叙白站在夜色中的记忆档案馆"
                  className="hero-image"
                />
                <div className="hero-shade" />
                <div className="hero-status">
                  <span className="status-pill">今晚在线</span>
                  <p>星期六 · 22:18</p>
                </div>
                <div className="hero-copy">
                  <p className="eyebrow">今晚，裴叙白在这里</p>
                  <h1>今天不用表现得很好。</h1>
                  <p>回来就够了。</p>
                </div>
              </div>

              <section className="checkin">
                <div className="section-heading">
                  <div>
                    <span>今晚签到</span>
                    <h2>想让我怎么陪你？</h2>
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
                  <strong>和裴叙白一起入睡</strong>
                  <span>12分钟 · 呼吸放松 · 雨夜档案馆</span>
                </span>
                <span className="entry-arrow">开始</span>
              </button>

              <section className="memory-preview">
                <div className="section-heading compact">
                  <div>
                    <span>他记得的你</span>
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
                  <img src="/pei-xubai.png" alt="" />
                  <span />
                </div>
                <div>
                  <strong>裴叙白</strong>
                  <small>{MODE_COPY[mode].label}模式 · 正在陪你</small>
                </div>
                <button type="button" onClick={startSleep}>
                  哄睡
                </button>
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
                      {message.role === "pei" && (
                        <img src="/pei-xubai.png" alt="" />
                      )}
                      <div>
                        <p>{message.text}</p>
                        <small>{message.time}</small>
                      </div>
                    </div>
                  ),
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
                  告诉裴叙白你现在的感受
                </label>
                <input
                  id="chat-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="想说什么都可以…"
                  autoComplete="off"
                />
                <button type="submit" disabled={!input.trim()}>
                  发送
                </button>
              </form>
            </section>
          )}

          {tab === "memory" && (
            <section className="memory-view">
              <div className="page-intro">
                <span>MEMORY ARCHIVE</span>
                <h1>他记得的你</h1>
                <p>记忆由你决定。随时修改、删除，或者只把一件事留到明天。</p>
              </div>
              <form className="memory-form" onSubmit={addMemory}>
                <label htmlFor="memory-input">希望裴叙白记住什么？</label>
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
                <img src="/pei-xubai.png" alt="裴叙白" />
              </div>
              <span className="status-pill">虚拟角色 · 今晚在线</span>
              <h1>裴叙白</h1>
              <p className="profile-role">记忆重构师 · 夜航陪伴者</p>
              <blockquote>
                “每一次晚安，都是与你重逢。”
              </blockquote>
              <div className="profile-settings">
                <label>
                  <span>
                    <strong>语音回应</strong>
                    <small>使用设备内置中文语音试听</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={voiceOn}
                    onChange={(event) => setVoiceOn(event.target.checked)}
                  />
                </label>
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
                  裴叙白可以倾听、陪伴和帮助你放松，但不能替代真人关系、医疗或心理治疗，也不会要求你只依赖他。
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
            ["profile", "人", "我的"],
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
        <section className="sleep-overlay" role="dialog" aria-modal="true">
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
            <span className="sleep-label">雨夜档案馆</span>
            <div className={`breathing-orb ${sleeping ? "is-playing" : ""}`}>
              <span>晚安</span>
            </div>
            <p className="sleep-quote">{SLEEP_LINES[sleepLine]}</p>
            <strong className="sleep-clock">{clock}</strong>
            <small>音频将在结束后自动停止</small>
            <div className="sleep-controls">
              <button
                type="button"
                onClick={() => setVoiceOn((current) => !current)}
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
                  setSleepLine((current) => (current + 1) % SLEEP_LINES.length)
                }
              >
                下一句
              </button>
            </div>
          </div>
          <p className="sleep-footer">
            不用回复。把手机扣下也可以，我会按时关掉声音。
          </p>
        </section>
      )}
    </main>
  );
}
