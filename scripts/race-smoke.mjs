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

async function waitResult() {
  // Pass null arg so options aren't swallowed as pageFunction arg (PW default timeout 30s).
  // ~5.5× track: idle lose ~2.5–3 min; timeout must exceed worst case.
  const handle = await page.waitForFunction(
    () => {
      const s = window.__gulasch.getDebugSnapshot();
      return s.phase === "result" ? s : null;
    },
    null,
    { timeout: 360000 },
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
// ~5.5× prior ~30s idle lose → floor well below expected (~150–180s).
if (soloSnap.elapsed < 90) {
  console.error("FAIL: rival solo finished too fast", soloSnap.elapsed);
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
if (soloSnap.rivalZ < soloSnap.finishZ) {
  console.error("FAIL: lose without rival reaching finishZ", soloSnap);
  process.exit(1);
}
console.log("OK");
