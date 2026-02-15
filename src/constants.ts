import type { SceneId } from "@/types";

/** Scene used as entry/root (e.g. main menu). Change here when adding submenus or different root. */
export const ROOT_SCENE_ID: SceneId = "menu";

export const HEADER_HEIGHT = 58;

/** z-index for header/FPS above game content */
export const HEADER_Z_INDEX = 10000;

/** Max 32-bit z-index so reload overlay stays above everything (including app-loading) */
export const RELOAD_OVERLAY_Z_INDEX = 2147483647;

/** z-index for initial loading screen (below reload overlay) */
export const APP_LOADING_Z_INDEX = 99999;

export const GAME_BACKGROUND_COLOR = 0x1a1628;

export const MAGIC_WORDS_API_URL =
  "https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords";

export const PHOENIX_MAX_SPRITES = 10;
