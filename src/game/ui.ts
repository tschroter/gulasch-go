export type RaceOutcome = "win" | "lose";

const COPY = {
  win: {
    title: "Gulasch geliefert!",
    de: "Du hast die Lieferung zuerst gebracht.",
    en: "Goulash delivered — you beat the rival to the finish.",
  },
  lose: {
    title: "Rival zuerst!",
    de: "Der Rivale hat den Gulasch-Zuschlag geholt.",
    en: "Rival won — they reached the delivery zone first.",
  },
} as const;

export class RaceUI {
  private readonly root: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly de: HTMLElement;
  private readonly en: HTMLElement;

  constructor() {
    this.root = document.querySelector("#result")!;
    this.panel = this.root.querySelector(".result-panel")!;
    this.title = document.querySelector("#result-title")!;
    this.de = document.querySelector("#result-de")!;
    this.en = document.querySelector("#result-en")!;
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
