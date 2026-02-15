import type { SceneId, SceneRegistryEntry } from "@/types";
import { MenuScene } from "@/scenes/MenuScene";
import { AceOfShadowsScene } from "@/scenes/AceOfShadowsScene";
import { MagicWordsScene } from "@/scenes/MagicWordsScene";
import { PhoenixFlameScene } from "@/scenes/PhoenixFlameScene";
import { assetManager } from "@/loaders/AssetManager";

export const sceneRegistry = new Map<SceneId, SceneRegistryEntry>([
  [
    "menu",
    {
      create: (ctx) => new MenuScene(ctx),
    },
  ],
  [
    "ace-of-shadows",
    {
      preload: () => assetManager.getCardTextures(),
      create: (ctx) => new AceOfShadowsScene(ctx),
    },
  ],
  [
    "magic-words",
    {
      preload: () => assetManager.getMagicWordsAssets(),
      create: (ctx) => new MagicWordsScene(ctx),
    },
  ],
  [
    "phoenix-flame",
    {
      create: (ctx) => new PhoenixFlameScene(ctx),
    },
  ],
]);
