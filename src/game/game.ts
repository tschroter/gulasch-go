import * as THREE from "three";
import { ChaseCamera } from "./chaseCamera";
import { Input } from "./input";
import { Track } from "./track";
import {
  PLAYER_PALETTE,
  RIVAL_PALETTE,
  Truck,
} from "./truck";
import { RaceUI, type RaceOutcome } from "./ui";

/** Internal PS1-ish framebuffer resolution. */
const PS1_WIDTH = 320;
const PS1_HEIGHT = 240;

type Phase = "racing" | "result";

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly input = new Input();
  private readonly ui = new RaceUI();
  private readonly track = new Track();
  private readonly player: Truck;
  private readonly rival: Truck;
  private readonly chase: ChaseCamera;
  private readonly rt: THREE.WebGLRenderTarget;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera: THREE.OrthographicCamera;
  private readonly clock = new THREE.Clock();

  private phase: Phase = "racing";
  private outcome: RaceOutcome | null = null;
  private rivalBaseSpeed = 12;
  private raf = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x6ec6e8);

    this.rt = new THREE.WebGLRenderTarget(PS1_WIDTH, PS1_HEIGHT, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.rt.texture.generateMipmaps = false;

    const mat = new THREE.MeshBasicMaterial({ map: this.rt.texture });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.quadScene.add(quad);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.scene.fog = new THREE.Fog(0x6ec6e8, 40, 130);
    this.scene.add(new THREE.AmbientLight(0xb0c4d8, 0.75));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.05);
    sun.position.set(20, 40, 10);
    this.scene.add(sun);

    // Flat sky dome stub.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(160, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x6ec6e8, side: THREE.BackSide }),
    );
    this.scene.add(sky);

    this.scene.add(this.track.mesh);

    this.player = new Truck(this.track, PLAYER_PALETTE, "player");
    this.rival = new Truck(this.track, RIVAL_PALETTE, "rival");
    this.scene.add(this.player.mesh, this.rival.mesh);

    this.chase = new ChaseCamera(PS1_WIDTH / PS1_HEIGHT);

    this.onResize();
    window.addEventListener("resize", this.onResize);
    this.resetRace();
  }

  start(): void {
    this.clock.start();
    const tick = (): void => {
      this.raf = requestAnimationFrame(tick);
      this.frame();
    };
    this.raf = requestAnimationFrame(tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.input.dispose();
    this.rt.dispose();
    this.renderer.dispose();
  }

  private resetRace(): void {
    this.phase = "racing";
    this.outcome = null;
    this.ui.hide();
    // Fair but beatable: player head start; rival slower than a clean WASD run.
    this.rivalBaseSpeed = 9.2 + Math.random() * 0.8;
    this.player.reset(0.04, 1.15);
    this.rival.reset(0.005, -1.15);
    this.chase.reset(this.player);
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.input.consumeRestart()) {
      this.resetRace();
    }

    if (this.phase === "racing") {
      this.player.updatePlayer(dt, this.input.state);

      // Mild reactivity: if player is ahead, rival pushes a little; never a rocket.
      const lead = this.player.progress - this.rival.progress;
      const rivalSpeed =
        this.rivalBaseSpeed + THREE.MathUtils.clamp(-lead * 4, -1.5, 2);
      this.rival.updateRival(dt, rivalSpeed, -1.05);

      if (this.player.finished || this.rival.finished) {
        this.phase = "result";
        // First across wins; simultaneous → player courtesy win if both same frame.
        if (this.player.finished && !this.rival.finished) {
          this.outcome = "win";
        } else if (this.rival.finished && !this.player.finished) {
          this.outcome = "lose";
        } else {
          this.outcome =
            this.player.progress >= this.rival.progress ? "win" : "lose";
        }
        this.ui.showResult(this.outcome);
      }
    }

    this.chase.update(dt, this.player);

    // Low-res scene → nearest upscale (PS1 presentation).
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene, this.chase.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  private readonly onResize = (): void => {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    // Keep internal framebuffer fixed for chunky pixels; camera aspect matches PS1 buffer.
    this.chase.setAspect(PS1_WIDTH / PS1_HEIGHT);
  };
}
