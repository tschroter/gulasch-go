import "./style.css";
import { Game } from "./game/game";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) {
  throw new Error("Missing #game-canvas");
}

const game = new Game(canvas);
game.start();

declare global {
  interface Window {
    __gulasch?: Game;
  }
}

if (import.meta.env.DEV) {
  window.__gulasch = game;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.dispose();
    delete window.__gulasch;
  });
}
