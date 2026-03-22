import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import demoScript from "../remotion/demo-script.json" with { type: "json" };

const BASE_URL = process.env.DEMO_VIDEO_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "public", "demo-video", "shots");

async function getRunRouteMap() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {};
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const [runningRes, completedRes] = await Promise.all([
    supabase
      .from("runs")
      .select("id")
      .eq("status", "running")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("runs")
      .select("id")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    "@latestRunningRun": runningRes.data?.id
      ? `/runs/${runningRes.data.id}`
      : "/dashboard",
    "@latestCompletedRun": completedRes.data?.id
      ? `/runs/${completedRes.data.id}`
      : "/dashboard",
  };
}

async function ensureServerIsReachable() {
  const response = await fetch(BASE_URL, { redirect: "manual" });
  if (!response.ok && response.status !== 307) {
    throw new Error(
      `Expected a local RePro app at ${BASE_URL}, got status ${response.status}`
    );
  }
}

async function main() {
  await ensureServerIsReachable();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const routeMap = await getRunRouteMap();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.setExtraHTTPHeaders({ "x-patchpilot-role": "admin" });

  const page = await context.newPage();

  for (const scene of demoScript) {
    if (!scene.route || !scene.screenshot) {
      continue;
    }

    const resolvedRoute = routeMap[scene.route] ?? scene.route;
    const url = new URL(resolvedRoute, BASE_URL).toString();

    await page.goto(url, { waitUntil: "networkidle" });
    await page.addStyleTag({
      content: `
        nextjs-portal,
        [data-next-badge-root],
        [data-nextjs-toast],
        [data-nextjs-dev-tools-button],
        [data-next-mark],
        #nextjs-dev-tools-menu {
          display: none !important;
        }
      `,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);

    const outputPath = path.join(OUTPUT_DIR, scene.screenshot);
    await page.screenshot({
      path: outputPath,
      animations: "disabled",
      caret: "hide",
    });
    console.log(`captured ${scene.screenshot} <- ${resolvedRoute}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
