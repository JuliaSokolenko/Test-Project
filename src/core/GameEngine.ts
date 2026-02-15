import "pixi.js/browser";
import { Application, Container, Graphics } from "pixi.js";
import {
  GAME_BACKGROUND_COLOR,
  HEADER_HEIGHT,
  HEADER_Z_INDEX,
  RELOAD_OVERLAY_Z_INDEX,
  ROOT_SCENE_ID,
} from "@/constants";
import { SceneManager } from "@/core/SceneManager";
import { sceneRegistry } from "@/scenes/registry";
import { assetManager } from "@/loaders/AssetManager";
import { createFpsDisplay, type FpsDisplay } from "@/utils/fps";
import type { SceneId } from "@/types";
import type { GameHeader } from "@/types";

const CANVAS_ID = "game-canvas";

export class GameEngine {
  private pixiApp: Application | null = null;
  private sceneManager: SceneManager | null = null;
  private header: GameHeader | null = null;
  private fpsDisplay: FpsDisplay | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private reinitScheduled = false;
  private resizeSceneScheduled = false;
  private frameCount = 0;
  private initStartedAt = 0;
  private readyScheduled = false;
  private rootTransitionFramesLeft = 0;
  private readonly rootSceneId = ROOT_SCENE_ID;

  async init(initialScene: SceneId = ROOT_SCENE_ID): Promise<void> {
    this.frameCount = 0;
    this.initStartedAt = performance.now();
    this.canvas = this.createCanvas(false);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.canvas.addEventListener("webgl2contextlost", this.onContextLost);

    const app = new Application();
    await app.init({
      canvas: this.canvas,
      width,
      height,
      resizeTo: window,
      backgroundColor: GAME_BACKGROUND_COLOR,
      antialias: true,
      resolution: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
      autoStart: true,
    });

    this.pixiApp = app;
    app.stage.eventMode = "passive";
    app.stage.interactiveChildren = true;
    app.stage.sortableChildren = true;

    const headerContainer = new Container();
    headerContainer.zIndex = HEADER_Z_INDEX;
    const headerBg = new Graphics();
    headerBg.rect(0, 0, width, HEADER_HEIGHT);
    headerBg.fill(GAME_BACKGROUND_COLOR);
    headerContainer.addChild(headerBg);
    const fpsDisplay = createFpsDisplay();
    this.fpsDisplay = fpsDisplay;
    fpsDisplay.container.eventMode = "none";
    fpsDisplay.container.x = 12;
    fpsDisplay.container.y = 12;
    headerContainer.addChild(fpsDisplay.container);
    const headerRightSlot = new Container();
    headerRightSlot.x = width - 100 - 14 - 14;
    headerRightSlot.y = 0;
    headerContainer.addChild(headerRightSlot);
    this.header = {
      container: headerContainer,
      rightSlot: headerRightSlot,
      bg: headerBg,
    };
    app.stage.addChild(headerContainer);

    const onTransitionToRoot = (): void => {
      if (this.canvas) this.canvas.classList.remove("ready");
      this.rootTransitionFramesLeft = 12;
    };

    this.sceneManager = new SceneManager(app, this.header, sceneRegistry, {
      rootSceneId: this.rootSceneId,
      onTransitionToRoot,
    });
    void assetManager.preloadAll();
    await this.sceneManager.showScene(initialScene);

    this.readyScheduled = false;

    app.ticker.add((ticker) => this.onTick(ticker.deltaMS / 1000));
    setTimeout(() => this.showCanvasWhenReady(), 3000);
  }

  private createCanvas(appendToDom: boolean): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.objectFit = "contain";
    canvas.style.display = "none"; // hidden until .ready, so "two blocks" never flash
    if (appendToDom) document.body.appendChild(canvas);
    return canvas;
  }

  private readonly onContextLost = (e: Event): void => {
    (e as WebGLContextEvent).preventDefault?.();
    if (!this.reinitScheduled) this.scheduleReinit();
  };

  private scheduleReinit(): void {
    if (this.reinitScheduled) return;
    this.reinitScheduled = true;
    const sceneId = this.sceneManager?.getCurrentSceneId() ?? this.rootSceneId;
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onOrientation);
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
    if (canvas) {
      canvas.classList.remove("ready");
      canvas.removeEventListener("webglcontextlost", this.onContextLost);
      canvas.removeEventListener("webgl2contextlost", this.onContextLost);
    }
    if (this.pixiApp) {
      this.pixiApp.destroy(true, { children: true });
      this.pixiApp = null;
    }
    this.sceneManager = null;
    this.header = null;
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    this.init(sceneId)
      .then(() => {
        this.reinitScheduled = false;
        window.addEventListener("pageshow", this.onPageShow);
        window.addEventListener("pagehide", this.onPageHide);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
        window.addEventListener("resize", this.onResize);
        window.addEventListener("orientationchange", this.onOrientation);
      })
      .catch((err) => {
        this.reinitScheduled = false;
        console.error("Re-init failed:", err);
      });
  }

  private showCanvasWhenReady(): void {
    if (this.readyScheduled || !this.canvas) return;
    this.readyScheduled = true;
    const canvas = this.canvas;
    canvas.classList.add("ready");
    if (!canvas.parentNode) document.body.appendChild(canvas);
    document.getElementById("reload-overlay")?.style.setProperty("display", "none", "important");
  }

  private onTick(delta: number): void {
    this.frameCount += 1;
    if (this.sceneManager) {
      this.sceneManager.update(delta);
      if (this.fpsDisplay) this.fpsDisplay.update();
    }

    if (this.rootTransitionFramesLeft > 0) {
      this.rootTransitionFramesLeft -= 1;
      if (this.rootTransitionFramesLeft === 0 && this.canvas) {
        this.canvas.classList.add("ready");
      }
      return;
    }

    const elapsed = performance.now() - this.initStartedAt;
    if (this.frameCount >= 15 && elapsed >= 500) {
      this.showCanvasWhenReady();
    }
  }

  private resizeRendererNow(): void {
    if (!this.pixiApp) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.pixiApp.renderer.resize(w, h);
    if (this.header?.bg) {
      this.header.bg.clear();
      this.header.bg.rect(0, 0, w, HEADER_HEIGHT);
      this.header.bg.fill(GAME_BACKGROUND_COLOR);
    }
    if (this.header) {
      this.header.rightSlot.x = w - 100 - 14 - 14;
    }
    if (this.resizeSceneScheduled) return;
    this.resizeSceneScheduled = true;
    requestAnimationFrame(() => {
      this.resizeSceneScheduled = false;
      const sceneManager = this.sceneManager;
      const sceneId = sceneManager?.getCurrentSceneId();
      if (!sceneId) return;
      if (sceneManager!.notifyResize(w, h)) return;
      void sceneManager!.showScene(sceneId);
    });
  }

  private readonly onResize = (): void => this.resizeRendererNow();
  private readonly onOrientation = (): void => this.resizeRendererNow();

  private readonly onPageShow = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      this.showPurpleOverlay();
      location.reload();
    }
  };

  private showPurpleOverlay(): void {
    const overlay = document.getElementById("reload-overlay");
    if (overlay) overlay.style.setProperty("display", "block", "important");
    else {
      const el = document.createElement("div");
      el.id = "reload-overlay";
      el.style.cssText = `position:fixed;inset:0;background:#1a1628;z-index:${RELOAD_OVERLAY_Z_INDEX};pointer-events:none;`;
      document.body.appendChild(el);
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.showPurpleOverlay();
    } else {
      const overlay = document.getElementById("reload-overlay");
      if (overlay) overlay.style.setProperty("display", "none", "important");
      const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
      if (canvas?.parentNode) canvas.classList.add("ready");
    }
    if (document.visibilityState !== "visible" || this.reinitScheduled) return;
    const renderer = this.pixiApp?.renderer as { context?: { isLost?: boolean } } | undefined;
    if (renderer?.context?.isLost) this.scheduleReinit();
  };

  private readonly onPageHide = (): void => {
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
    if (canvas) canvas.classList.remove("ready");
    this.showPurpleOverlay();
  };

  getSceneManager(): SceneManager | null {
    return this.sceneManager;
  }

  async run(): Promise<void> {
    document.getElementById("reload-overlay")?.style.setProperty("display", "none", "important");
    const existingCanvas = document.getElementById(CANVAS_ID);
    if (existingCanvas?.parentNode) existingCanvas.parentNode.removeChild(existingCanvas);
    window.addEventListener("pageshow", this.onPageShow);
    window.addEventListener("pagehide", this.onPageHide);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    await this.init(this.rootSceneId);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onOrientation);
  }
}
