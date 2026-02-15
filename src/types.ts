/**
 * Shared types for the game application.
 */

import type { Container, Graphics } from "pixi.js";

export type SceneId = "menu" | "ace-of-shadows" | "magic-words" | "phoenix-flame";

/** Minimal contract for scenes: only the slot for back button. */
export interface SceneHeaderSlot {
  rightSlot: Container;
}

/** In-game header: background bar with FPS (left) and a slot for back button (right). */
export interface GameHeader extends SceneHeaderSlot {
  container: Container;
  bg?: Graphics;
}

export interface AssetService {
  load(key: string): Promise<unknown>;
}

export interface SceneCreateContext {
  app: import("pixi.js").Application;
  headerSlot: SceneHeaderSlot;
  showScene: (id: SceneId) => void;
  showMenu: () => void;
  preloaded?: unknown;
  /** Optional asset service for on-demand loading. */
  assetService?: AssetService;
}

export type SceneContext = SceneCreateContext;

export type SceneFactory = (ctx: SceneCreateContext) => Scene;

export interface SceneRegistryEntry {
  preload?: () => Promise<unknown>;
  create: SceneFactory;
}

export interface Scene {
  onEnter(headerSlot?: SceneHeaderSlot): void | Promise<void>;
  onExit(headerSlot?: SceneHeaderSlot): void;
  update?(delta: number): void;
  onResize?(width: number, height: number): void;
  isReadyForTransition?(): boolean;
}
