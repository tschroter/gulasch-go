export type RaceOutcome = "win" | "lose";

const COPY = {
  win: {
    title: "Gulasch geliefert!",
    de: "OTTO hat die Lieferung zuerst gebracht.",
    en: "Goulash delivered — OTTO beat both rivals.",
  },
  lose: {
    title: "Konkurrenz zuerst!",
    de: "Ein Rivale hat den Gulasch-Zuschlag geholt.",
    en: "A rival reached the delivery gate first.",
  },
} as const;

export class RaceUI {
  private readonly root: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly de: HTMLElement;
  private readonly en: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly position: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly cargo: HTMLElement;
  private readonly cargoState: HTMLElement;

  constructor() {
    this.root = document.querySelector("#result")!;
    this.panel = this.root.querySelector(".result-panel")!;
    this.title = document.querySelector("#result-title")!;
    this.de = document.querySelector("#result-de")!;
    this.en = document.querySelector("#result-en")!;
    this.timer = document.querySelector("#hud-time")!;
    this.position = document.querySelector("#hud-position")!;
    this.speed = document.querySelector("#hud-speed")!;
    this.cargo = document.querySelector("#hud-cargo")!;
    this.cargoState = document.querySelector("#hud-cargo-state")!;
  }

  update(elapsed: number, rank: number, speed: number, cargo: number): void {
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    const tenths = Math.floor((elapsed % 1) * 10);
    this.timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${tenths}`;
    this.position.textContent = `${rank}/3`;
    this.speed.textContent = `${Math.round(speed * 3.2).toString().padStart(3, "0")} KM/H`;
    this.cargo.textContent = `${Math.round(cargo)}%`;
    const shaky = cargo < 80;
    this.cargoState.textContent = shaky ? "WACKELIG" : "STABIL";
    this.cargoState.classList.toggle("warning", shaky);
  }

  showResult(outcome: RaceOutcome): void {
    const copy = COPY[outcome];
    this.title.textContent = copy.title;
    this.de.textContent = copy.de;
    this.en.textContent = copy.en;
    this.panel.classList.toggle("win", outcome === "win");
    this.panel.classList.toggle("lose", outcome === "lose");
    this.root.classList.remove("hidden");
  }

  hide(): void {
    this.root.classList.add("hidden");
  }
}
