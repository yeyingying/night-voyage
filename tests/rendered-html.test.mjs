import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function productSources() {
  const [page, layout, css, chatRoute, characterClock] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/character-clock.ts", import.meta.url), "utf8"),
  ]);
  return { page, layout, css, chatRoute, characterClock };
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
