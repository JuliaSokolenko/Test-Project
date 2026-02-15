import { Container, Sprite, Text, Graphics, CanvasTextMetrics, TextStyle } from "pixi.js";
import type { Application, Texture } from "pixi.js";
import type { Scene, SceneContext, SceneHeaderSlot } from "@/types";
import type { MagicWordsResponse, MagicWordsEmoji } from "@/types/magicWords";
import type { MagicWordsAssets } from "@/loaders/AssetManager";
import { HEADER_HEIGHT } from "@/constants";
import { createBackButton } from "@/components/BackButton";

const EMOJI_SIZE = 20;
const AVATAR_SIZE = 80;
const BUBBLE_PADDING = 8;
const LINE_HEIGHT = 22;
const MAX_BUBBLE_WIDTH = 320;

export class MagicWordsScene implements Scene {
  private readonly app: Application;
  private readonly onBack: () => void;
  private readonly root = new Container();
  private readonly data: MagicWordsResponse;
  private readonly emojiTextures: Map<string, Texture>;
  private readonly avatarTextures: Map<string, Texture>;
  private wheelListener: {
    scrollArea: Graphics;
    onWheel: (e: { deltaY: number }) => void;
  } | null = null;
  private backButton: Container | null = null;
  private backButtonA11y: HTMLButtonElement | null = null;
  private backHandler = (): void => this.onBack();

  constructor(ctx: SceneContext) {
    const assets = ctx.preloaded as MagicWordsAssets;
    this.app = ctx.app;
    this.onBack = ctx.showMenu;
    this.data = assets?.data ?? { dialogue: [], emojies: [], avatars: [] };
    this.emojiTextures = assets?.emojiTextures ?? new Map();
    this.avatarTextures = assets?.avatarTextures ?? new Map();
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

    const emojies = this.data.emojies ?? [];
    const avatars = this.data.avatars ?? [];
    const dialogue = this.data.dialogue ?? [];

    const scroll = new Container();
    scroll.x = 0;
    scroll.y = 0;
    let y = 24;
    const marginH = 24;
    const contentWidth = width - marginH * 2;
    const bubbleMaxWidth = contentWidth - (AVATAR_SIZE + 20 + 20);

    for (const line of dialogue) {
      const avatar = avatars.find((a) => a.name === line.name);
      const isLeft = avatar?.position !== "right";
      const {
        container: bubble,
        width: bw,
        height: bh,
      } = this.buildBubble(line.text, line.name, emojies, isLeft, bubbleMaxWidth);
      scroll.addChild(bubble);
      bubble.y = y;

      const avatarTex = avatar ? this.avatarTextures.get(avatar.name) : null;
      if (avatar && avatarTex) {
        const av = new Sprite(avatarTex);
        av.anchor.set(0.5, 0.8);
        av.width = AVATAR_SIZE;
        av.height = AVATAR_SIZE;
        if (isLeft) {
          av.x = AVATAR_SIZE / 2 + 12;
          bubble.x = AVATAR_SIZE + 20;
        } else {
          av.x = contentWidth - AVATAR_SIZE / 2 - 12;
          bubble.x = contentWidth - AVATAR_SIZE - 20 - bw;
        }
        av.y = y + bh / 2 + 10;
        scroll.addChildAt(av, scroll.getChildIndex(bubble));
      } else {
        bubble.x = isLeft ? 20 : contentWidth - bw - 20;
      }

      y += bh + 20;
    }

    const totalContentHeight = y + 20;
    const viewHeight = height - HEADER_HEIGHT - 20;
    let scrollY = HEADER_HEIGHT;

    const scrollBottom = HEADER_HEIGHT + viewHeight - totalContentHeight;
    const minScrollY = Math.min(HEADER_HEIGHT, scrollBottom);
    const clampScroll = () => {
      scrollY = Math.max(minScrollY, Math.min(HEADER_HEIGHT, scrollY));
      scroll.y = scrollY;
    };

    scroll.y = HEADER_HEIGHT;
    scroll.zIndex = 0;
    const mask = new Graphics();
    mask.zIndex = 0;
    mask.rect(0, HEADER_HEIGHT, width, viewHeight);
    mask.fill(0x000000, 0.01);
    scroll.mask = mask;
    this.root.addChild(mask);
    this.root.addChild(scroll);

    const onWheel = (e: { deltaY: number }) => {
      scrollY -= e.deltaY * 0.5;
      clampScroll();
    };
    const scrollArea = new Graphics();
    scrollArea.zIndex = 0;
    scrollArea.rect(0, HEADER_HEIGHT, width, viewHeight);
    scrollArea.fill(0x000000, 0);
    scrollArea.eventMode = "static";
    scrollArea.on("wheel", onWheel);
    this.wheelListener = { scrollArea, onWheel };
    this.root.addChild(scrollArea);
  }

  private buildBubble(
    text: string,
    name: string,
    emojies: MagicWordsEmoji[],
    isLeft: boolean,
    availableWidth: number = MAX_BUBBLE_WIDTH
  ): { container: Container; width: number; height: number } {
    const parts = parseInlineEmojis(text, emojies);
    const tokens = partsToTokens(parts);
    const bubble = new Container();
    const fontSize = Math.min(16, Math.max(12, Math.floor(availableWidth / 24)));
    const totalW = Math.max(100, Math.min(availableWidth, 420));
    const maxLineW = totalW - BUBBLE_PADDING * 2;
    const lineHeight = LINE_HEIGHT;

    const style = new TextStyle({
      fontFamily: "system-ui",
      fontSize,
      fill: 0xe0e0e0,
      align: "left",
    });

    let x = BUBBLE_PADDING;
    let y = 28;
    let contentMaxW = 0;

    for (const token of tokens) {
      if (token.type === "text" && token.value === "\n") {
        x = BUBBLE_PADDING;
        y += lineHeight;
        continue;
      }

      const w = measureTokenWidth(token, style, EMOJI_SIZE);

      if (x + w > maxLineW && (token.type !== "text" || token.value !== " ")) {
        x = BUBBLE_PADDING;
        y += lineHeight;
      }

      if (token.type === "emoji") {
        const tex = this.emojiTextures.get(token.name);
        if (tex) {
          const sp = new Sprite(tex);
          sp.width = EMOJI_SIZE;
          sp.height = EMOJI_SIZE;
          sp.anchor.set(0, 0.3);
          sp.x = x;
          sp.y = y + (lineHeight - EMOJI_SIZE) / 2;
          bubble.addChild(sp);
        }
        x += EMOJI_SIZE;
      } else {
        const label = new Text({ text: token.value, style });
        label.anchor.set(0, 0);
        label.x = x;
        label.y = y;
        bubble.addChild(label);
        x += w;
      }

      contentMaxW = Math.max(contentMaxW, x - BUBBLE_PADDING);
    }

    const totalH = y + lineHeight + BUBBLE_PADDING + 4;
    const bg = new Graphics();
    bg.roundRect(0, 0, totalW, totalH, 12);
    bg.fill(isLeft ? 0x2a3540 : 0x3a3545, 0.95);
    bg.stroke({ width: 1, color: 0x4a5560 });
    bubble.addChildAt(bg, 0);

    const nameText = new Text({
      text: name,
      style: {
        fontFamily: "system-ui",
        fontSize: 12,
        fill: 0x88aacc,
        fontWeight: "600",
      },
    });
    nameText.x = BUBBLE_PADDING;
    nameText.y = 6;
    bubble.addChild(nameText);

    return { container: bubble, width: totalW, height: totalH };
  }

  onExit(_headerSlot?: SceneHeaderSlot): void {
    if (this.backButtonA11y?.parentNode) {
      this.backButtonA11y.remove();
      this.backButtonA11y = null;
    }
    if (this.backButton) {
      this.backButton.off("pointerdown", this.backHandler);
      this.backButton = null;
    }
    if (this.wheelListener) {
      this.wheelListener.scrollArea.off("wheel", this.wheelListener.onWheel);
      this.wheelListener = null;
    }
    this.root.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.app.stage.removeChild(this.root);
  }
}

type Part = { type: "text"; text: string } | { type: "emoji"; name: string };

/** Token for manual word wrap: text (word/space/newline) or emoji. */
type Token = { type: "text"; value: string } | { type: "emoji"; name: string };

/** Splits parts into tokens: words, spaces, and emoji separately (space is also a token). */
function partsToTokens(parts: Part[]): Token[] {
  const tokens: Token[] = [];
  for (const part of parts) {
    if (part.type === "emoji") {
      tokens.push({ type: "emoji", name: part.name });
      continue;
    }
    const segments = part.text.match(/\S+|\s+|\n/g) ?? [];
    for (const seg of segments) {
      tokens.push({ type: "text", value: seg });
    }
  }
  return tokens;
}

function measureTextWidth(text: string, style: TextStyle): number {
  const metrics = CanvasTextMetrics.measureText(text, style, undefined, false);
  return metrics.width;
}

function measureTokenWidth(token: Token, style: TextStyle, emojiSize: number): number {
  if (token.type === "emoji") return emojiSize;
  return measureTextWidth(token.value, style);
}

function parseInlineEmojis(text: string, emojies: MagicWordsEmoji[]): Part[] {
  const parts: Part[] = [];
  const names = emojies.map((e) => e.name);
  let remaining = text;
  while (remaining.length) {
    const match = remaining.match(/\{(\w+)\}/);
    if (!match) {
      parts.push({ type: "text", text: remaining });
      break;
    }
    const idx = match.index!;
    if (idx > 0) parts.push({ type: "text", text: remaining.slice(0, idx) });
    const name = match[1];
    if (names.includes(name)) parts.push({ type: "emoji", name });
    else parts.push({ type: "text", text: match[0] });
    remaining = remaining.slice(idx + match[0].length);
  }
  return parts;
}
