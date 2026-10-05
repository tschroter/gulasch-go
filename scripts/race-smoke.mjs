import { chromium } from "playwright";

const url = process.env.GAME_URL ?? "http://localhost:5173/";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__gulasch != null);
const contextName = await page.$eval("#game-canvas", (canvas) => {
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  return gl?.constructor.name ?? null;
});
if (!contextName) {
  console.error("FAIL: expected a WebGL canvas");
  process.exit(1);
}

async function waitResult() {
  const handle = await page.waitForFunction(
    () => {
      const s = window.__gulasch.getDebugSnapshot();
      return s.phase === "result" ? s : null;
    },
    null,
    { timeout: 60000 },
  );
  return handle.jsonValue();
}

// --- Rival solo ---
await page.keyboard.press("r");
await page.waitForTimeout(200);
const soloSnap = await waitResult();
console.log("rival_solo", soloSnap);

// --- Player holds W ---
await page.keyboard.press("r");
await page.waitForTimeout(100);
await page.keyboard.down("w");
const raceSnap = await waitResult();
await page.keyboard.up("w");
console.log("player_w", raceSnap);

await browser.close();

if (soloSnap.outcome !== "lose") {
  console.error("FAIL: rival solo should lose for player");
  process.exit(1);
}
if (soloSnap.elapsed < 15) {
  console.error("FAIL: rival solo finished implausibly early", soloSnap.elapsed);
  process.exit(1);
}
if (raceSnap.outcome !== "win") {
  console.error("FAIL: holding W should win", raceSnap);
  process.exit(1);
}
if (raceSnap.elapsed >= soloSnap.elapsed) {
  console.error("FAIL: player hold-W should finish faster than rival solo", {
    raceSnap,
    soloSnap,
  });
  process.exit(1);
}

// Finish must be the delivery gate near the end — not a mid-course ratio.
const finishRatio = raceSnap.finishZ / raceSnap.totalLength;
if (!(finishRatio > 0.97 && finishRatio < 1)) {
  console.error("FAIL: finishZ not near end of track", {
    finishZ: raceSnap.finishZ,
    totalLength: raceSnap.totalLength,
    finishRatio,
  });
  process.exit(1);
}
if (raceSnap.playerZ < raceSnap.finishZ) {
  console.error("FAIL: win without reaching finishZ", raceSnap);
  process.exit(1);
}
if (!soloSnap.racers.some((racer) => racer.name !== "OTTO" && racer.finished)) {
  console.error("FAIL: lose without a rival reaching finishZ", soloSnap);
  process.exit(1);
}
if (raceSnap.racers.length !== 3 || new Set(raceSnap.racers.map((racer) => racer.name)).size !== 3) {
  console.error("FAIL: expected OTTO, HANS and FRITZ", raceSnap.racers);
  process.exit(1);
}
if (!(raceSnap.cargo >= 0 && raceSnap.cargo <= 100 && raceSnap.rank >= 1 && raceSnap.rank <= 3)) {
  console.error("FAIL: invalid cargo/rank snapshot", raceSnap);
  process.exit(1);
}
if (raceSnap.drawCalls > 100 || raceSnap.triangles > 50000) {
  console.error("FAIL: scene exceeds approved render budgets", {
    drawCalls: raceSnap.drawCalls,
    triangles: raceSnap.triangles,
  });
  process.exit(1);
}
console.log("OK", { contextName });
