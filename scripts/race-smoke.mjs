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

// --- Rival solo ---
await page.keyboard.press("r");
await page.waitForTimeout(200);
const solo = await page.waitForFunction(
  () => {
    const s = window.__gulasch.getDebugSnapshot();
    return s.phase === "result" ? s : null;
  },
  { timeout: 30000 },
);
const soloSnap = await solo.jsonValue();
console.log("rival_solo", soloSnap);

// --- Player holds W ---
await page.keyboard.press("r");
await page.waitForTimeout(100);
await page.keyboard.down("w");
const raced = await page.waitForFunction(
  () => {
    const s = window.__gulasch.getDebugSnapshot();
    return s.phase === "result" ? s : null;
  },
  { timeout: 30000 },
);
await page.keyboard.up("w");
const raceSnap = await raced.jsonValue();
console.log("player_w", raceSnap);

await browser.close();

if (soloSnap.outcome !== "lose") {
  console.error("FAIL: rival solo should lose for player");
  process.exit(1);
}
if (soloSnap.elapsed < 8) {
  console.error("FAIL: rival solo finished too fast", soloSnap.elapsed);
  process.exit(1);
}
if (raceSnap.outcome !== "win") {
  console.error("FAIL: holding W should win", raceSnap);
  process.exit(1);
}
console.log("OK");
