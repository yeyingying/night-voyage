import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function productSources() {
  const [
    page,
    layout,
    css,
    chatRoute,
    ttsRoute,
    characterClock,
    personaEngine,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/tts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/character-clock.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/persona-engine.ts", import.meta.url), "utf8"),
  ]);
  return {
    page,
    layout,
    css,
    chatRoute,
    ttsRoute,
    characterClock,
    personaEngine,
  };
}

test("ships the finished game shell and both visual styles", async () => {
  const { page, layout, css } = await productSources();

  assert.match(layout, /夜航恋人/);
  assert.match(layout, /export const viewport:\s*Viewport/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project|_sites-preview/);

  assert.match(page, /visualStyle === "real"/);
  assert.match(page, /changeVisualStyle\("manhwa"\)/);
  assert.match(page, /changeVisualStyle\("real"\)/);
  assert.match(page, /CHARACTER_IDS\.map/);
  assert.match(css, /\.visual-real/);
  assert.match(css, /@media \(min-width: 960px\)/);
});

test("keeps the mobile chat composer visible without iOS input zoom", async () => {
  const { page, layout, css } = await productSources();

  assert.match(layout, /interactiveWidget:\s*"resizes-content"/);
  assert.match(page, /window\.visualViewport/);
  assert.match(page, /--mobile-viewport-height/);
  assert.match(page, /chatInputFocused \? " keyboard-open"/);
  assert.match(page, /onFocus=\{\(\) => setChatInputFocused\(true\)\}/);
  assert.match(
    css,
    /\.composer input\s*\{[\s\S]*?font-size:\s*16px;/,
  );
  assert.match(css, /\.phone-stage\.keyboard-open \.bottom-nav/);
});

test("guards adult intimacy, local photo previews, and character boundaries", async () => {
  const { page, css, chatRoute } = await productSources();

  assert.match(page, /new Set<CharacterId>\(\["yan", "chi"\]\)/);
  assert.match(page, /ADULT_CONFIRMATION_KEY/);
  assert.match(page, /确认你已满 18 岁/);
  assert.match(page, /URL\.createObjectURL\(file\)/);
  assert.match(page, /照片只在本机/);
  assert.match(css, /\.adult-gate/);
  assert.match(css, /\.image-message-card/);

  assert.match(chatRoute, /INTIMATE_TENSION_PROMPTS/);
  assert.match(chatRoute, /RELATIONAL_FRICTION_PROMPT/);
  assert.match(chatRoute, /不使用冷暴力/);
  assert.match(chatRoute, /当前文本模型不会读取图片像素/);
  assert.match(chatRoute, /亲密图片互动仅向已确认成年的玩家开放/);
});

test("adds restrained character-led daily check-ins", async () => {
  const { page, css, chatRoute, characterClock } = await productSources();

  assert.match(page, /PROACTIVE_FIRST_MINUTES = \[90, 150\]/);
  assert.match(page, /PROACTIVE_FOLLOWUP_MINUTES = \[240, 360\]/);
  assert.match(page, /PROACTIVE_DAILY_LIMIT = 3/);
  assert.match(page, /getCharacterWorldSnapshot/);
  assert.match(page, /nextReachableTime/);
  assert.match(page, /刚好想起你/);
  assert.match(page, /主动来找你/);
  assert.match(page, /CHAT_HISTORY_KEY/);
  assert.match(css, /\.proactive-message-cue/);

  assert.match(characterClock, /CHARACTER_SCHEDULES/);
  assert.match(characterClock, /weekday:/);
  assert.match(characterClock, /weekend:/);
  assert.match(characterClock, /availability: "unavailable"/);
  assert.match(characterClock, /export function getCharacterWorldSnapshot/);
  assert.match(chatRoute, /worldTimelinePrompt/);
  assert.match(chatRoute, /旧事件推进到现在/);
  assert.match(chatRoute, /超过事件合理时长/);
});

test("keeps every companion available during the core night-voyage window", async () => {
  const { page, characterClock } = await productSources();

  assert.match(characterClock, /NIGHT_COMPANION_START = m\(20\)/);
  assert.match(characterClock, /NIGHT_COMPANION_END = m\(8\)/);
  assert.match(characterClock, /NIGHT_COMPANION_BLOCKS/);
  assert.match(characterClock, /训练复盘后的夜聊/);
  assert.match(characterClock, /闭馆后的星空时间/);
  assert.match(characterClock, /availability: "available"/);
  assert.match(page, /PROACTIVE_QUIET_START_HOUR = 2/);
  assert.match(page, /PROACTIVE_QUIET_START_MINUTE = 30/);
});

test("pilots continuous living personas for Chi Yao and Xie Linyuan", async () => {
  const { page, css, chatRoute, ttsRoute, personaEngine } =
    await productSources();

  assert.match(personaEngine, /PILOT_CHARACTER_IDS.*\["chi", "yan"\]/);
  assert.match(personaEngine, /高难度模拟机考核/);
  assert.match(personaEngine, /争议拍品复核/);
  assert.match(personaEngine, /socialTies/);
  assert.match(personaEngine, /RELATIONSHIP_STAGES/);
  assert.match(personaEngine, /DAILY_BOND_CAP = 5/);
  assert.match(personaEngine, /recordPersonaInteraction/);
  assert.match(personaEngine, /derivePersonaVoiceMood/);
  assert.match(personaEngine, /VOICE_PERFORMANCES/);
  assert.match(personaEngine, /生活事件必须随真实时间推进/);

  assert.match(page, /PERSONA_STATE_STORAGE_KEY/);
  assert.match(page, /recordPersonaTurn/);
  assert.match(page, /personaState: requestPersonaState/);
  assert.match(page, /persona-pulse/);
  assert.match(css, /\.persona-pulse/);

  assert.match(chatRoute, /personaSystemPrompt/);
  assert.match(chatRoute, /voiceMood/);
  assert.match(ttsRoute, /applyVoiceBreak/);
  assert.match(ttsRoute, /performance\?\.speedDelta/);
});

test("answers the player's actual question instead of masking model failures", async () => {
  const { page, chatRoute } = await productSources();

  assert.match(chatRoute, /DIRECT_ANSWER_PROMPT/);
  assert.match(chatRoute, /第一句必须先回答那个问题/);
  assert.match(chatRoute, /replyEvadesDirectQuestion/);
  assert.match(chatRoute, /focusedAnswerPrompt/);
  assert.match(chatRoute, /isDirectQuestionMessage/);
  assert.match(chatRoute, /rewriteAttempt < 2/);
  assert.match(chatRoute, /上一版没有正面回答/);
  assert.match(chatRoute, /喜欢你\|不喜欢/);
  assert.match(chatRoute, /我们先来分析一下/);
  assert.match(chatRoute, /isAdviceQuestion/);
  assert.match(chatRoute, /const chatPath = "\/v1\/chat\/completions"/);
  assert.match(page, /这条问题还没回答/);
  assert.match(page, /不会拿预设话术敷衍你/);
  assert.doesNotMatch(
    page,
    /Dynamic reply unavailable; using fallback reply/,
  );
});
