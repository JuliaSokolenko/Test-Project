import type { Texture } from "pixi.js";
import { loadCardTextures } from "@/loaders/cards";
import { loadMagicWordsAssets, type MagicWordsAssets } from "@/loaders/magicWords";

/** Re-export so registry and scenes use AssetManager as single entry point. */
export type { MagicWordsAssets };

export type AssetKey = "cards" | "magic-words";

export type LoadProgressCallback = (loaded: number, total: number) => void;

export class AssetManager {
  load(key: AssetKey): Promise<unknown> {
    switch (key) {
      case "cards":
        return loadCardTextures();
      case "magic-words":
        return loadMagicWordsAssets();
      default:
        return Promise.reject(new Error(`Unknown asset key: ${String(key)}`));
    }
  }

  getCardTextures(): Promise<Texture[]> {
    return this.load("cards") as Promise<Texture[]>;
  }

  getMagicWordsAssets(): Promise<MagicWordsAssets> {
    return this.load("magic-words") as Promise<MagicWordsAssets>;
  }

  async preloadAll(
    keys: AssetKey[] = ["magic-words", "cards"],
    onProgress?: LoadProgressCallback
  ): Promise<void> {
    const total = keys.length;
    for (let loaded = 0; loaded < keys.length; loaded++) {
      await this.load(keys[loaded]);
      onProgress?.(loaded + 1, total);
    }
  }
}

export const assetManager = new AssetManager();
