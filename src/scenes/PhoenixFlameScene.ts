import { Container, Text, Texture, BlurFilter } from "pixi.js";
import type { Application } from "pixi.js";
import type { Scene, SceneContext, SceneHeaderSlot } from "@/types";
import { PHOENIX_MAX_SPRITES } from "@/constants";
import { FireEmitter } from "@/effects/FireEmitter";
import { createBackButton } from "@/components/BackButton";

/** Reference screen size for scale = 1 (shorter side in px). */
const FIRE_SCALE_REFERENCE = 600;
const FIRE_SCALE_MIN = 0.5;
const FIRE_SCALE_MAX = 2.5;

export class PhoenixFlameScene implements Scene {
  private readonly app: Application;
  private readonly onBack: () => void;
  private readonly root = new Container();
  private fireEmitter: FireEmitter | null = null;
  private fireWrap: Container | null = null;
  private title: Text | null = null;
  private backButton: Container | null = null;
  private backButtonA11y: HTMLButtonElement | null = null;
  private backHandler = (): void => this.onBack();

  constructor(ctx: SceneContext) {
    this.app = ctx.app;
    this.onBack = ctx.showMenu;
  }

  onEnter(headerSlot?: SceneHeaderSlot): void {
    const canvas = document.getElementById("game-canvas");
    if (canvas instanceof HTMLCanvasElement) canvas.style.cursor = "default";
    this.root.removeChildren();
    this.root.sortableChildren = true;
    this.root.zIndex = 0;
    this.app.stage.addChild(this.root);

    const width = this.app.screen.width;
    const height = this.app.screen.height;

    if (headerSlot) {
      headerSlot.rightSlot.removeChildren();
      const { container, a11yElement } = createBackButton(this.backHandler);
      this.backButton = container;
      this.backButtonA11y = a11yElement;
      headerSlot.rightSlot.addChild(container);
      document.body.appendChild(a11yElement);
    }

    const flameTexture = this.createFlameTexture();
    const centerX = width / 2;
    const baseY = height * 0.84;

    const baseWidth = 100;
    const flameHeight = 62;

    this.fireEmitter = new FireEmitter(flameTexture, {
      maxParticles: PHOENIX_MAX_SPRITES,
      spawnInterval: 0.06,
      lifetime: 1.6,
      emitX: centerX,
      emitY: baseY,
      baseWidth,
      coneSpread: 7,
      coneMinHalfWidth: 3,
      flameHeight,
      staticCone: false,
      staticConeCount: 0,
      velocityY: [-95, -55],
      velocityX: [-6, 6],
      flickerAmplitude: 22,
      flickerFreq: 9,
      particleWidth: 40,
      particleHeight: 110,
    });
    const fireWrap = new Container();
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    fireWrap.blendMode = isMobile ? "normal" : "add";
    fireWrap.eventMode = "none";
    if (!isMobile) {
      fireWrap.filters = [new BlurFilter({ strength: 1.5 })];
    }
    fireWrap.addChild(this.fireEmitter.view);
    this.fireWrap = fireWrap;
    this.root.addChild(fireWrap);
    this.updateFireScale();

    const title = new Text({
      text: "Phoenix Flame",
      style: {
        fontFamily: "system-ui",
        fontSize: Math.min(24, width / 20),
        fill: 0xffaa44,
        fontWeight: "700",
      },
    });
    title.anchor.set(0.5, 0);
    title.x = width / 2;
    title.y = height * 0.08;
    this.title = title;
    this.root.addChild(title);
  }

  onResize(width: number, height: number): void {
    this.updateFireScale(width, height);
    if (this.fireEmitter) this.fireEmitter.setEmitPosition(width / 2, height * 0.84);
    if (this.title) {
      this.title.x = width / 2;
      this.title.y = height * 0.08;
      this.title.style.fontSize = Math.min(24, width / 20);
    }
  }

  private createFlameTexture(): import("pixi.js").Texture {
    const w = 96;
    const h = 96;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2d context is not available; cannot create flame texture.");
    }
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.max(w, h) * 0.7;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255, 255, 235, 0.95)");
    g.addColorStop(0.1, "rgba(255, 252, 210, 0.92)");
    g.addColorStop(0.22, "rgba(255, 235, 150, 0.78)");
    g.addColorStop(0.38, "rgba(255, 180, 70, 0.42)");
    g.addColorStop(0.52, "rgba(255, 110, 25, 0.12)");
    g.addColorStop(0.65, "rgba(255, 60, 0, 0)");
    g.addColorStop(1, "rgba(255, 40, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return Texture.from(canvas);
  }

  private updateFireScale(width?: number, height?: number): void {
    if (!this.fireWrap || !this.fireEmitter) return;
    const w = width ?? this.app.screen.width;
    const h = height ?? this.app.screen.height;
    const centerX = w / 2;
    const baseY = h * 0.84;
    const size = Math.min(w, h);
    const scale = Math.max(FIRE_SCALE_MIN, Math.min(FIRE_SCALE_MAX, size / FIRE_SCALE_REFERENCE));
    this.fireWrap.pivot.set(centerX, baseY);
    this.fireWrap.position.set(centerX, baseY);
    this.fireWrap.scale.set(scale);
  }

  update(delta: number): void {
    if (!this.fireEmitter) return;
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    this.fireEmitter.setEmitPosition(width / 2, height * 0.84);
    this.updateFireScale();
    this.fireEmitter.update(delta);
  }

  onExit(_headerSlot?: SceneHeaderSlot): void {
    this.title = null;
    this.fireWrap = null;
    if (this.backButtonA11y?.parentNode) {
      this.backButtonA11y.remove();
      this.backButtonA11y = null;
    }
    if (this.backButton) {
      this.backButton.off("pointerdown", this.backHandler);
      this.backButton = null;
    }
    if (this.fireEmitter) {
      this.fireEmitter.destroy();
      this.fireEmitter = null;
    }
    this.root.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.app.stage.removeChild(this.root);
  }
}
