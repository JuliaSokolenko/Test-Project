import { Container, Sprite, Graphics } from "pixi.js";
import type { Application } from "pixi.js";
import type { Texture } from "pixi.js";
import type { Scene, SceneContext, SceneHeaderSlot } from "@/types";
import {
  ACE_CARD_COUNT,
  ACE_STACK_COUNT,
  ACE_MOVE_INTERVAL_MS,
  ACE_MOVE_DURATION_MS,
  CARD_WIDTH_DESKTOP,
  CARD_HEIGHT_DESKTOP,
  CARD_CORNER_RADIUS_DESKTOP,
  SETTLE_DURATION_SEC,
  COLLAPSE_RIGHT_DURATION_SEC,
  ROTATION_SETTLE_DURATION_SEC,
} from "@/constants/aceOfShadows";
import {
  getCardDimensions,
  getCardPositionInStack,
  getCardRotationInStack,
  getSpreadFactor,
  applyStackRotations,
  applyTopCardSpread,
} from "./aceOfShadows/stackHelpers";
import { createBackButton } from "@/components/BackButton";
import { easeInOutCubic } from "@/utils/easing";

export class AceOfShadowsScene implements Scene {
  private readonly app: Application;
  private readonly onBack: () => void;
  private readonly root = new Container();
  private backButton: Container | null = null;
  private backButtonA11y: HTMLButtonElement | null = null;
  private backHandler = (): void => this.onBack();
  private stacks: Container[] = [];
  private cardSprites: Container[] = [];
  private moveTimer = 0;
  private animProgress = -1;
  private animFromStack = 0;
  private animToStack = 0;
  private animCard: Container | null = null;
  private cardTextures: Texture[];
  private settleFromStackIndex = -1;
  private settleProgress = -1;
  private collapseRightProgress = -1;
  private rotationSettleStackIndex = -1;
  private rotationSettleProgress = -1;
  private rotationSettleStartRotations: number[] = [];
  /** 0 = left → right, 1 = right → left. Switches only when the source deck is empty. */
  private moveDirection: 0 | 1 = 0;
  private cardWidth = CARD_WIDTH_DESKTOP;
  private cardHeight = CARD_HEIGHT_DESKTOP;
  private cardCornerRadius = CARD_CORNER_RADIUS_DESKTOP;

  constructor(ctx: SceneContext) {
    this.app = ctx.app;
    this.onBack = ctx.showMenu;
    this.cardTextures = (ctx.preloaded as Texture[]) ?? [];
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
    const dims = getCardDimensions(width, height);
    this.cardWidth = dims.width;
    this.cardHeight = dims.height;
    this.cardCornerRadius = dims.cornerRadius;

    const cardsPerStack = Math.floor(ACE_CARD_COUNT / ACE_STACK_COUNT);
    const stackY = height * 0.5 + this.cardHeight / 2;
    const centerX = width * 0.5;
    const stackOffset = width * 0.24;
    const leftCenterX = centerX - stackOffset;
    const rightCenterX = centerX + stackOffset;

    this.stacks = [];
    this.cardSprites = [];

    const stackPositions = [leftCenterX, rightCenterX];
    let cardIndex = 0;
    for (let s = 0; s < ACE_STACK_COUNT; s++) {
      const stack = new Container();
      stack.x = stackPositions[s];
      stack.y = stackY;
      stack.rotation = -0.03;
      this.root.addChild(stack);
      this.stacks.push(stack);

      const count = s === 0 ? cardsPerStack : ACE_CARD_COUNT - cardsPerStack;
      for (let i = 0; i < count; i++) {
        const card = this.createCardSprite(cardIndex % this.cardTextures.length);
        const pos = getCardPositionInStack(i, count);
        card.x = pos.x;
        card.y = pos.y;
        card.rotation = getCardRotationInStack(i, count);
        card.zIndex = i;
        stack.addChild(card);
        this.cardSprites.push(card);
        cardIndex++;
      }
    }

    this.moveTimer = ACE_MOVE_INTERVAL_MS / 1000;
    this.animProgress = -1;
    this.animCard = null;
    this.settleFromStackIndex = -1;
    this.settleProgress = -1;
    this.collapseRightProgress = -1;
    this.rotationSettleStackIndex = -1;
    this.rotationSettleProgress = -1;
    this.rotationSettleStartRotations = [];
    this.moveDirection = 0;
  }

  private createCardSprite(textureIndex: number): Container {
    const texture = this.cardTextures[textureIndex];
    const scale = Math.min(this.cardWidth / texture.width, this.cardHeight / texture.height);
    const w = texture.width * scale;
    const h = texture.height * scale;

    const card = new Container();
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(scale);
    sprite.eventMode = "none";
    card.addChild(sprite);

    const mask = new Graphics();
    mask.roundRect(-w / 2, -h, w, h, this.cardCornerRadius);
    mask.fill({ color: 0xffffff, alpha: 0 });
    card.addChild(mask);
    card.mask = mask;

    card.eventMode = "none";
    return card;
  }

  update(delta: number): void {
    const dtSec = delta;
    if (this.updateRotationSettle(dtSec)) return;
    if (this.updateSettle(dtSec)) return;
    this.updateCollapseRight(dtSec);
    if (this.updateFlyAnimation(dtSec)) return;
    this.moveTimer -= dtSec;
    if (this.moveTimer <= 0) {
      this.moveTimer = ACE_MOVE_INTERVAL_MS / 1000;
      this.startMoveTopCard();
    }
  }

  private updateRotationSettle(dtSec: number): boolean {
    if (this.rotationSettleProgress < 0) return false;
    this.rotationSettleProgress += dtSec / ROTATION_SETTLE_DURATION_SEC;
    const progress = Math.min(1, this.rotationSettleProgress);
    const t = easeInOutCubic(progress);
    const stack =
      this.rotationSettleStackIndex >= 0 ? this.stacks[this.rotationSettleStackIndex] : null;
    if (stack && this.rotationSettleStartRotations.length === stack.children.length) {
      const n = stack.children.length;
      for (let i = 0; i < n; i++) {
        const card = stack.children[i] as Container;
        const start = this.rotationSettleStartRotations[i];
        const end = getCardRotationInStack(i, n);
        card.rotation = start + (end - start) * t;
      }
      if (this.rotationSettleProgress >= 1) {
        applyStackRotations(stack);
        this.rotationSettleStackIndex = -1;
        this.rotationSettleProgress = -1;
        this.rotationSettleStartRotations = [];
      }
    } else {
      this.rotationSettleStackIndex = -1;
      this.rotationSettleProgress = -1;
      this.rotationSettleStartRotations = [];
    }
    return true;
  }

  private updateSettle(dtSec: number): boolean {
    if (this.settleProgress < 0) return false;
    this.settleProgress += dtSec / SETTLE_DURATION_SEC;
    const progress = Math.min(1, this.settleProgress);
    const spread = getSpreadFactor(progress);
    const fromStack =
      this.settleFromStackIndex >= 0 ? this.stacks[this.settleFromStackIndex] : null;
    if (fromStack) applyTopCardSpread(fromStack, spread);
    if (this.settleProgress >= 1) {
      this.settleFromStackIndex = -1;
      this.settleProgress = -1;
    }
    return true;
  }

  private updateCollapseRight(dtSec: number): void {
    if (this.collapseRightProgress < 0) return;
    this.collapseRightProgress += dtSec / COLLAPSE_RIGHT_DURATION_SEC;
    const progress = Math.min(1, this.collapseRightProgress);
    const spread = 1 - easeInOutCubic(progress);
    const toStack = this.stacks[this.animToStack];
    if (toStack) applyTopCardSpread(toStack, spread);
    if (this.collapseRightProgress >= 1) this.collapseRightProgress = -1;
  }

  private updateFlyAnimation(dtSec: number): boolean {
    if (this.animProgress < 0) return false;
    const moveDurationSec = ACE_MOVE_DURATION_MS / 1000;
    this.animProgress += dtSec / moveDurationSec;

    if (this.animProgress >= 1 && this.animCard && this.stacks[this.animToStack]) {
      this.finishFlyAndLandCard();
      return false;
    }

    if (this.animCard && this.animProgress < 1) {
      this.tickFlyPosition();
    }
    return true;
  }

  private finishFlyAndLandCard(): void {
    if (!this.animCard) return;
    const targetStack = this.stacks[this.animToStack];
    if (!targetStack) return;
    this.animCard.parent?.removeChild(this.animCard);
    const idx = targetStack.children.length;
    const newTopPos = getCardPositionInStack(idx, idx + 1);
    this.animCard.x = newTopPos.x;
    this.animCard.y = newTopPos.y;
    this.animCard.rotation = 0;
    this.animCard.zIndex = idx;
    targetStack.addChild(this.animCard);
    if (idx > 0) {
      const prevTop = targetStack.children[idx - 1] as Container;
      const prevPos = getCardPositionInStack(idx - 1, idx + 1);
      prevTop.x = prevPos.x;
      prevTop.y = prevPos.y;
    }
    this.rotationSettleStackIndex = this.animToStack;
    this.rotationSettleStartRotations = targetStack.children.map((c) => (c as Container).rotation);
    this.rotationSettleProgress = 0;
    this.animCard = null;
    this.animProgress = -1;
    this.settleFromStackIndex = this.animFromStack;
    this.settleProgress = 0;
  }

  private tickFlyPosition(): void {
    if (!this.animCard) return;
    const fromStack = this.stacks[this.animFromStack];
    const toStack = this.stacks[this.animToStack];
    if (!fromStack || !toStack) return;
    const nFrom = fromStack.children.length;
    const fromPos = getCardPositionInStack(nFrom, nFrom + 1);
    const fromX = fromStack.x + fromPos.x;
    const fromY = fromStack.y + fromPos.y;
    const nTo = toStack.children.length;
    const toPos = getCardPositionInStack(nTo, nTo + 1);
    const toX = toStack.x + toPos.x;
    const toY = toStack.y + toPos.y;
    const t = easeInOutCubic(this.animProgress);
    this.animCard.x = fromX + (toX - fromX) * t;
    this.animCard.y = fromY + (toY - fromY) * t;
  }

  private startMoveTopCard(): void {
    const leftCount = this.stacks[0]?.children.length ?? 0;
    const rightCount = this.stacks[1]?.children.length ?? 0;

    if (this.moveDirection === 0 && leftCount === 0) this.moveDirection = 1;
    if (this.moveDirection === 1 && rightCount === 0) this.moveDirection = 0;
    const fromStack = this.moveDirection === 0 ? 0 : 1;
    const toStack = this.moveDirection === 0 ? 1 : 0;

    const stack = this.stacks[fromStack];
    if (!stack || stack.children.length === 0) return;
    const n = stack.children.length;
    const topCard = stack.children[n - 1];
    if (!(topCard instanceof Container)) return;
    stack.removeChild(topCard);

    const fromPos = getCardPositionInStack(n - 1, n);
    topCard.parent = null;
    this.root.addChild(topCard);
    topCard.x = stack.x + fromPos.x;
    topCard.y = stack.y + fromPos.y;
    topCard.rotation = stack.rotation;

    if (stack.children.length > 0) {
      const newTop = stack.children[stack.children.length - 1] as Container;
      newTop.x = 0;
      newTop.y = 0;
      this.rotationSettleStackIndex = fromStack;
      this.rotationSettleStartRotations = stack.children.map((c) => (c as Container).rotation);
      this.rotationSettleProgress = 0;
    }

    const toStackContainer = this.stacks[toStack];
    if (toStackContainer && toStackContainer.children.length > 0) {
      this.collapseRightProgress = 0;
    }

    this.animCard = topCard;
    this.animFromStack = fromStack;
    this.animToStack = toStack;
    this.animProgress = 0;
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
    this.animCard = null;
    this.root.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.cardSprites = [];
    this.stacks = [];
    this.app.stage.removeChild(this.root);
  }
}
