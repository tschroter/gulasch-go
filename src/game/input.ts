export type KeyState = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  restart: boolean;
};

const KEY_MAP: Record<string, keyof KeyState> = {
  KeyW: "forward",
  KeyS: "back",
  KeyA: "left",
  KeyD: "right",
  KeyR: "restart",
};

export class Input {
  readonly state: KeyState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    restart: false,
  };

  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
  }

  /** True only on the frame restart was pressed. */
  consumeRestart(): boolean {
    if (!this.state.restart) return false;
    this.state.restart = false;
    return true;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    const action = KEY_MAP[event.code];
    if (!action) return;
    event.preventDefault();
    this.pressed.add(event.code);
    this.state[action] = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_MAP[event.code];
    if (!action) return;
    event.preventDefault();
    this.pressed.delete(event.code);
    if (action !== "restart") {
      this.state[action] = false;
    }
  };

  private readonly clear = (): void => {
    this.pressed.clear();
    this.state.forward = false;
    this.state.back = false;
    this.state.left = false;
    this.state.right = false;
  };
}
