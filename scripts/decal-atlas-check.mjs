import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.env.GAME_URL ?? "http://localhost:5173/";
const evidenceDir =
  process.env.DECAL_EVIDENCE_DIR ??
  "/cursor/stores/bc-e63afbb0-8709-4483-8dd5-94fed871e355/media/readable-ps1-ui";

const FIXTURES = [
  "otto-chase",
  "hans-near",
  "hans-oblique",
  "fritz-near",
  "fritz-oblique",
  "three-rear",
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__gulasch != null);

const first = await page.evaluate(() => window.__gulasch.getDecalDebug());
assertAtlas(first, "initial load");

await page.keyboard.press("r");
await page.waitForTimeout(200);
const afterRestart = await page.evaluate(() => window.__gulasch.getDecalDebug());
if (afterRestart.createCount !== first.createCount) {
  fail("restart allocated another decal atlas", { first, afterRestart });
}

const metrics = {};
await mkdir(evidenceDir, { recursive: true });

const atlasDataUrl = await page.evaluate(() => window.__gulasch.getDecalAtlasDataURL());
if (!atlasDataUrl) fail("atlas data URL missing");
await writeFile(path.join(evidenceDir, "decal-atlas.png"), Buffer.from(atlasDataUrl.split(",")[1], "base64"));

for (const fixture of FIXTURES) {
  const result = await page.evaluate((kind) => window.__gulasch.applyDecalFixture(kind), fixture);
  await page.waitForTimeout(80);
  assertIdentities(result);
  metrics[fixture] = result;
  await page.screenshot({
    path: path.join(evidenceDir, `${fixture}.png`),
    type: "png",
  });
}

const canvasShot = await page.locator("#game-canvas").screenshot({ type: "png" });
await writeFile(path.join(evidenceDir, "three-rear-canvas.png"), canvasShot);

await page.evaluate(() => window.__gulasch.dispose());
const disposed = await page.evaluate(() => {
  const g = window.__gulasch;
  return g ? g.getDecalDebug() : null;
});
if (disposed?.live) fail("atlas still live after dispose", disposed);

await writeFile(path.join(evidenceDir, "projected-pixels.json"), `${JSON.stringify({ atlas: first, afterRestart, metrics }, null, 2)}\n`);

await browser.close();
console.log("OK", {
  createCount: first.createCount,
  anisotropy: first.anisotropy,
  evidenceDir,
  ottoPlatePx: metrics["otto-chase"].trucks[0].plate,
  hansCargoPx: metrics["hans-near"].trucks[1].cargo,
});

function assertAtlas(info, label) {
  if (info.size !== 1024 || !info.powerOfTwo) fail(`${label}: atlas must be 1024×1024`, info);
  if (info.createCount !== 1 || !info.live) fail(`${label}: expected one live atlas`, info);
  if (info.magFilter !== "LinearFilter") fail(`${label}: magFilter`, info);
  if (info.minFilter !== "LinearMipmapLinearFilter") fail(`${label}: minFilter`, info);
  if (!info.generateMipmaps) fail(`${label}: mipmaps disabled`, info);
  if (info.anisotropy < 1 || info.anisotropy > info.anisotropyCap) fail(`${label}: anisotropy`, info);
  if (info.colorSpace !== "srgb") fail(`${label}: color space`, info);
  if (!info.uvInsideCells) fail(`${label}: UV escaped cell`, info);
  const strings = info.strings.join(",");
  if (strings !== "GULASCH,OTTO,HANS,FRITZ") fail(`${label}: strings`, info);
}

function assertIdentities(result) {
  for (const truck of result.trucks) {
    if (truck.cellId !== truck.name || truck.plateString !== truck.name) {
      fail("identity mix-up", truck);
    }
  }
}

function fail(message, extra) {
  console.error("FAIL:", message, extra ?? "");
  process.exit(1);
}
