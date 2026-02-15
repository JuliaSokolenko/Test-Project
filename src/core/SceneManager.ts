import type { Application } from "pixi.js";
import type {
  SceneId,
  Scene,
  GameHeader,
  SceneCreateContext,
  SceneHeaderSlot,
  SceneRegistryEntry,
} from "@/types";
import { ROOT_SCENE_ID } from "@/constants";
import { assetManager } from "@/loaders/AssetManager";

export interface SceneManagerOptions {
  rootSceneId?: SceneId;
  onTransitionToRoot?: () => void;
  onSceneShown?: () => void;
}

export class SceneManager {
  private readonly app: Application;
  private readonly header: GameHeader;
  private readonly headerSlot: SceneHeaderSlot;
  private readonly options: SceneManagerOptions;
  private readonly rootSceneId: SceneId;
  private readonly registry: Map<SceneId, SceneRegistryEntry>;
  private readonly scenes = new Map<SceneId, Scene>();
  private currentScene: Scene | undefined;

  constructor(
    app: Application,
    header: GameHeader,
    registry: Map<SceneId, SceneRegistryEntry>,
    options?: SceneManagerOptions
  ) {
    this.app = app;
    this.header = header;
    this.headerSlot = { rightSlot: header.rightSlot };
    this.registry = registry;
    this.options = options ?? {};
    this.rootSceneId = this.options.rootSceneId ?? ROOT_SCENE_ID;
  }

  async showScene(id: SceneId): Promise<void> {
    const currentId = this.getCurrentSceneId();
    const wasOnRoot = currentId === this.rootSceneId;
    if (id === this.rootSceneId && !wasOnRoot && this.currentScene) {
      this.options.onTransitionToRoot?.();
    }
    const next = await this.getScene(id);
    if (this.currentScene) {
      this.currentScene.onExit(this.headerSlot);
    }
    this.header.rightSlot.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.currentScene = next;
    void Promise.resolve(this.currentScene.onEnter(this.headerSlot)).then(() => {
      requestAnimationFrame(() => this.options.onSceneShown?.());
    });
  }

  showMenu(): void {
    void this.showScene(this.rootSceneId);
  }

  update(delta: number): void {
    if (this.currentScene?.update) {
      this.currentScene.update(delta);
    }
  }

  getCurrentSceneId(): SceneId | undefined {
    if (!this.currentScene) return undefined;
    for (const [id, scene] of this.scenes) {
      if (scene === this.currentScene) return id;
    }
    return undefined;
  }

  notifyResize(width: number, height: number): boolean {
    if (!this.currentScene?.onResize) return false;
    this.currentScene.onResize(width, height);
    return true;
  }

  private async getScene(id: SceneId): Promise<Scene> {
    let scene = this.scenes.get(id);
    if (!scene) {
      const entry = this.registry.get(id);
      if (!entry) throw new Error(`Unknown scene: ${id}`);
      const preloaded = entry.preload ? await entry.preload() : undefined;
      const ctx: SceneCreateContext = {
        app: this.app,
        headerSlot: this.headerSlot,
        showScene: (sid) => void this.showScene(sid),
        showMenu: () => this.showMenu(),
        preloaded,
        assetService: assetManager,
      };
      scene = entry.create(ctx);
      this.scenes.set(id, scene);
    }
    return scene;
  }
}
