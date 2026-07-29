import { env } from "cloudflare:workers";

type CharacterId =
  | "pei"
  | "chi"
  | "yan"
  | "lu"
  | "cheng"
  | "qi"
  | "shen"
  | "xu";

type StoredMessage = {
  id: number;
  role: "companion" | "user" | "system";
  text: string;
  time: string;
  sentAt?: number;
  kind?: "text" | "proactive";
  imageName?: string;
  duration?: number;
};

type StoredHistory = Record<CharacterId, StoredMessage[]>;

type PreparedStatement = {
  bind: (...values: unknown[]) => PreparedStatement;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type HistoryDatabase = {
  prepare: (query: string) => PreparedStatement;
};

const CHARACTER_IDS: CharacterId[] = [
  "pei",
  "chi",
  "yan",
  "lu",
  "cheng",
  "qi",
  "shen",
  "xu",
];
const SESSION_COOKIE = "night_voyage_session";
const MAX_MESSAGES_PER_CHARACTER = 80;
const MAX_TEXT_LENGTH = 4000;
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  history TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
)`;

function database(): HistoryDatabase | null {
  const binding = (env as unknown as { DB?: HistoryDatabase }).DB;
  return binding ?? null;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const pair of cookies.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function sessionId(request: Request) {
  const existing = cookieValue(request, SESSION_COOKIE);
  return /^[a-f0-9-]{20,64}$/i.test(existing)
    ? existing
    : crypto.randomUUID();
}

function sessionCookie(id: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

function json(
  body: unknown,
  status: number,
  id: string,
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": sessionCookie(id),
    },
  });
}

function validMessage(value: unknown): StoredMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<StoredMessage>;
  if (
    typeof message.id !== "number" ||
    !Number.isFinite(message.id) ||
    !["companion", "user", "system"].includes(message.role ?? "") ||
    typeof message.text !== "string" ||
    !message.text.trim() ||
    typeof message.time !== "string"
  ) {
    return null;
  }

  return {
    id: message.id,
    role: message.role as StoredMessage["role"],
    text: message.text.trim().slice(0, MAX_TEXT_LENGTH),
    time: message.time.slice(0, 24),
    sentAt:
      typeof message.sentAt === "number" && Number.isFinite(message.sentAt)
        ? message.sentAt
        : undefined,
    kind:
      message.kind === "proactive"
        ? "proactive"
        : "text",
    imageName:
      typeof message.imageName === "string"
        ? message.imageName.slice(0, 240)
        : undefined,
    duration:
      typeof message.duration === "number" && Number.isFinite(message.duration)
        ? Math.max(1, Math.min(60, Math.round(message.duration)))
        : undefined,
  };
}

function validHistory(value: unknown): StoredHistory | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const history = Object.fromEntries(
    CHARACTER_IDS.map((id) => {
      const messages = Array.isArray(source[id])
        ? source[id]
            .map(validMessage)
            .filter((message): message is StoredMessage => Boolean(message))
            .slice(-MAX_MESSAGES_PER_CHARACTER)
        : [];
      return [id, messages];
    }),
  ) as StoredHistory;
  return history;
}

async function ensureSchema(db: HistoryDatabase) {
  await db.prepare(CREATE_TABLE_SQL).run();
}

export async function GET(request: Request) {
  const id = sessionId(request);
  const db = database();
  if (!db) {
    return json({ history: null, durable: false }, 503, id);
  }

  try {
    await ensureSchema(db);
    const row = await db
      .prepare(
        "SELECT history, updated_at AS updatedAt FROM chat_sessions WHERE session_id = ?",
      )
      .bind(id)
      .first<{ history: string; updatedAt: number }>();
    if (!row) {
      return json({ history: null, durable: true }, 200, id);
    }
    const parsed = validHistory(JSON.parse(row.history));
    return json(
      {
        history: parsed,
        updatedAt: row.updatedAt,
        durable: true,
      },
      200,
      id,
    );
  } catch (error) {
    console.warn("Unable to restore chat history.", error);
    return json({ history: null, durable: false }, 503, id);
  }
}

export async function POST(request: Request) {
  const id = sessionId(request);
  const db = database();
  if (!db) {
    return json({ saved: false, durable: false }, 503, id);
  }

  let body: { history?: unknown };
  try {
    body = (await request.json()) as { history?: unknown };
  } catch {
    return json({ error: "聊天记录格式无效" }, 400, id);
  }
  const history = validHistory(body.history);
  if (!history) {
    return json({ error: "聊天记录格式无效" }, 400, id);
  }

  try {
    await ensureSchema(db);
    const updatedAt = Date.now();
    await db
      .prepare(
        `INSERT INTO chat_sessions (session_id, history, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           history = excluded.history,
           updated_at = excluded.updated_at`,
      )
      .bind(id, JSON.stringify(history), updatedAt)
      .run();
    return json({ saved: true, durable: true, updatedAt }, 200, id);
  } catch (error) {
    console.warn("Unable to save chat history.", error);
    return json({ saved: false, durable: false }, 503, id);
  }
}
