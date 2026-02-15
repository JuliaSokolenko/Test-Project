import { Container, Text, Graphics, Rectangle } from "pixi.js";
import type { Application } from "pixi.js";
import type { SceneId, Scene, SceneContext, SceneHeaderSlot } from "@/types";

const TITLE = "Game Developer Assignment";
const BUTTONS: { id: SceneId; label: string }[] = [
  { id: "ace-of-shadows", label: "Ace of Shadows" },
  { id: "magic-words", label: "Magic Words" },
  { id: "phoenix-flame", label: "Phoenix Flame" },
];

interface MenuButtonRef {
  hit: Graphics;
  label: Text;
}

export class MenuScene implements Scene {
  private readonly app: Application;
  private readonly onSelect: (id: SceneId) => void;
  private readonly root = new Container();
  private menuTitle: Text | null = null;
  private menuButtons: MenuButtonRef[] = [];
  private menuBounds: { x: number; y: number; w: number; h: number; id: SceneId }[] = [];
  private menuW = 0;
  private menuButtonHeight = 0;
  private menuA11yButtons: HTMLButtonElement[] = [];
  private menuListeners: {
    hitArea: Graphics;
    onPointerDown: (e: { global: { x: number; y: number } }) => void;
    onPointerMove: (e: { global: { x: number; y: number } }) => void;
    onPointerOut: () => void;
  } | null = null;

  constructor(ctx: SceneContext) {
    this.app = ctx.app;
    this.onSelect = ctx.showScene;
  }

  onEnter(headerSlot?: SceneHeaderSlot): void {
    this.root.removeChildren();
    this.root.eventMode = "static";
    this.root.interactiveChildren = true;
    this.root.zIndex = 0;
    this.app.stage.addChild(this.root);
    if (headerSlot) headerSlot.rightSlot.removeChildren();

    const width = this.app.screen.width;
    const height = this.app.screen.height;

    const title = new Text({
      text: TITLE,
      style: {
        fontFamily: "system-ui, sans-serif",
        fontSize: Math.min(28, width / 18),
        fill: 0xe8e0d0,
        fontWeight: "700",
      },
    });
    title.anchor.set(0.5, 0);
    title.x = width / 2;
    title.y = height * 0.12;
    this.menuTitle = title;
    this.root.addChild(title);

    const buttonHeight = Math.min(72, height / 8);
    const gap = Math.min(24, height / 30);
    const totalH = BUTTONS.length * buttonHeight + (BUTTONS.length - 1) * gap;
    let y = height / 2 - totalH / 2;
    const w = Math.min(320, width * 0.85);
    const left = width / 2 - w / 2;
    this.menuW = w;
    this.menuButtonHeight = buttonHeight;
    this.menuBounds = [];
    this.menuButtons = [];

    for (let i = 0; i < BUTTONS.length; i++) {
      const btn = BUTTONS[i];
      this.menuBounds.push({ x: left, y, w, h: buttonHeight, id: btn.id });
      const hit = new Graphics();
      hit.x = left;
      hit.y = y;
      hit.roundRect(0, 0, w, buttonHeight, 12);
      hit.fill(0x2a2535, 0.95);
      hit.stroke({ width: 2, color: 0x4a4560 });
      hit.eventMode = "none";
      this.root.addChild(hit);

      const label = new Text({
        text: btn.label,
        style: {
          fontFamily: "system-ui, sans-serif",
          fontSize: Math.min(22, width / 20),
          fill: 0xf0e8d8,
          fontWeight: "600",
        },
      });
      label.anchor.set(0.5, 0.5);
      label.x = width / 2;
      label.y = y + buttonHeight / 2;
      label.eventMode = "none";
      this.root.addChild(label);

      this.menuButtons.push({ hit, label });
      y += buttonHeight + gap;
    }

    const updateHover = (idx: number) => {
      for (let i = 0; i < this.menuButtons.length; i++) {
        const { hit } = this.menuButtons[i];
        const hover = i === idx;
        hit.clear();
        hit.roundRect(0, 0, this.menuW, this.menuButtonHeight, 12);
        hit.fill(hover ? 0x3a3545 : 0x2a2535, hover ? 0.98 : 0.95);
        hit.stroke({ width: 2, color: hover ? 0x6a6590 : 0x4a4560 });
      }
    };
    const onPointerDown = (e: { global: { x: number; y: number } }) => {
      const px = e.global.x;
      const py = e.global.y;
      const idx = this.menuBounds.findIndex(
        (b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
      );
      if (idx >= 0) this.onSelect(this.menuBounds[idx].id);
    };
    const canvas = this.app.canvas as HTMLCanvasElement;
    const onPointerMove = (e: { global: { x: number; y: number } }) => {
      const px = e.global.x;
      const py = e.global.y;
      const idx = this.menuBounds.findIndex(
        (b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
      );
      updateHover(idx);
      canvas.style.cursor = idx >= 0 ? "pointer" : "default";
    };
    const onPointerOut = () => {
      updateHover(-1);
      canvas.style.cursor = "default";
    };

    const hitArea = new Graphics();
    hitArea.rect(0, 0, width, height);
    hitArea.fill(0x000000, 0);
    hitArea.eventMode = "static";
    hitArea.hitArea = new Rectangle(0, 0, width, height);
    hitArea.on("pointerdown", onPointerDown);
    hitArea.on("pointermove", onPointerMove);
    hitArea.on("pointerout", onPointerOut);
    this.menuListeners = { hitArea, onPointerDown, onPointerMove, onPointerOut };
    this.root.addChild(hitArea);

    for (let i = 0; i < BUTTONS.length; i++) {
      const b = this.menuBounds[i];
      const btn = BUTTONS[i];
      const a11y = document.createElement("button");
      a11y.type = "button";
      a11y.setAttribute("role", "button");
      a11y.setAttribute("aria-label", btn.label);
      Object.assign(a11y.style, {
        position: "fixed",
        left: `${b.x}px`,
        top: `${b.y}px`,
        width: `${b.w}px`,
        height: `${b.h}px`,
        zIndex: 1000,
        margin: 0,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        opacity: 0,
        overflow: "hidden",
        clipPath: "inset(0 0 0 0)",
      });
      a11y.addEventListener("click", (e) => {
        e.preventDefault();
        this.onSelect(btn.id);
      });
      this.menuA11yButtons.push(a11y);
      document.body.appendChild(a11y);
    }
  }

  onResize(width: number, height: number): void {
    if (!this.menuTitle || this.menuButtons.length === 0 || !this.menuListeners) return;
    this.menuTitle.x = width / 2;
    this.menuTitle.y = height * 0.12;
    this.menuTitle.style.fontSize = Math.min(28, width / 18);

    const buttonHeight = Math.min(72, height / 8);
    const gap = Math.min(24, height / 30);
    const totalH = BUTTONS.length * buttonHeight + (BUTTONS.length - 1) * gap;
    let y = height / 2 - totalH / 2;
    const w = Math.min(320, width * 0.85);
    const left = width / 2 - w / 2;
    this.menuW = w;
    this.menuButtonHeight = buttonHeight;

    for (let i = 0; i < BUTTONS.length; i++) {
      this.menuBounds[i] = { x: left, y, w, h: buttonHeight, id: BUTTONS[i].id };
      const { hit, label } = this.menuButtons[i];
      hit.x = left;
      hit.y = y;
      hit.clear();
      hit.roundRect(0, 0, w, buttonHeight, 12);
      hit.fill(0x2a2535, 0.95);
      hit.stroke({ width: 2, color: 0x4a4560 });
      label.x = width / 2;
      label.y = y + buttonHeight / 2;
      label.style.fontSize = Math.min(22, width / 20);
      y += buttonHeight + gap;
    }

    this.menuListeners.hitArea.clear();
    this.menuListeners.hitArea.rect(0, 0, width, height);
    this.menuListeners.hitArea.fill(0x000000, 0);
    this.menuListeners.hitArea.hitArea = new Rectangle(0, 0, width, height);

    for (let i = 0; i < this.menuA11yButtons.length; i++) {
      const a11y = this.menuA11yButtons[i];
      const b = this.menuBounds[i];
      a11y.style.left = `${b.x}px`;
      a11y.style.top = `${b.y}px`;
      a11y.style.width = `${b.w}px`;
      a11y.style.height = `${b.h}px`;
    }
  }

  onExit(_headerSlot?: SceneHeaderSlot): void {
    const canvas = this.app.canvas as HTMLCanvasElement;
    if (canvas) canvas.style.cursor = "default";
    if (this.menuListeners) {
      const { hitArea, onPointerDown, onPointerMove, onPointerOut } = this.menuListeners;
      hitArea.off("pointerdown", onPointerDown);
      hitArea.off("pointermove", onPointerMove);
      hitArea.off("pointerout", onPointerOut);
      this.menuListeners = null;
    }
    for (const a11y of this.menuA11yButtons) {
      if (a11y.parentNode) a11y.remove();
    }
    this.menuA11yButtons = [];
    this.menuTitle = null;
    this.menuButtons = [];
    this.menuBounds = [];
    this.root.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.app.stage.removeChild(this.root);
  }
}
