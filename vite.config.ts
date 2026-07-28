import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const CLIENT_SOURCE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);

function sourceFilesWithin(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];

  return readdirSync(path, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const child = join(path, entry.name);
      return entry.isDirectory() ? sourceFilesWithin(child) : [child];
    });
}

function clientAssetRelease() {
  const hash = createHash("sha256");
  const sourceFiles = [
    ...sourceFilesWithin(join(PROJECT_ROOT, "app")),
    ...sourceFilesWithin(join(PROJECT_ROOT, "lib")),
    fileURLToPath(import.meta.url),
  ].filter((path) => CLIENT_SOURCE_EXTENSIONS.has(extname(path)));

  for (const path of sourceFiles) {
    hash.update(relative(PROJECT_ROOT, path));
    hash.update(readFileSync(path));
  }

  return hash.digest("hex").slice(0, 10);
}

const CLIENT_ASSET_RELEASE = clientAssetRelease();

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // Vinext entry chunk names can remain stable across releases. A
    // source-derived assets directory prevents phones from reusing stale JS.
    build: {
      assetsDir: `assets-${CLIENT_ASSET_RELEASE}`,
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
