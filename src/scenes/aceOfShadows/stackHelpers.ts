import type { Container } from "pixi.js";
import {
  TOP_CARD_OFFSET_X,
  TOP_CARD_OFFSET_Y,
  CARD_WIDTH_DESKTOP,
  CARD_HEIGHT_DESKTOP,
  CARD_CORNER_RADIUS_DESKTOP,
  CARD_WIDTH_PORTRAIT,
  CARD_HEIGHT_PORTRAIT,
  CARD_CORNER_RADIUS_PORTRAIT,
  MOBILE_PORTRAIT_MAX_WIDTH,
} from "@/constants/aceOfShadows";
import { easeInOutCubic } from "@/utils/easing";

export function getCardDimensions(
  screenWidth: number,
  screenHeight: number
): { width: number; height: number; cornerRadius: number } {
  const isPortrait = screenHeight > screenWidth;
  const isNarrow = screenWidth <= MOBILE_PORTRAIT_MAX_WIDTH;
  if (isPortrait && isNarrow) {
    return {
      width: CARD_WIDTH_PORTRAIT,
      height: CARD_HEIGHT_PORTRAIT,
      cornerRadius: CARD_CORNER_RADIUS_PORTRAIT,
    };
  }
  return {
    width: CARD_WIDTH_DESKTOP,
    height: CARD_HEIGHT_DESKTOP,
    cornerRadius: CARD_CORNER_RADIUS_DESKTOP,
  };
}

export function getCardPositionInStack(
  index: number,
  totalInStack: number
): { x: number; y: number } {
  const isTop = index === totalInStack - 1;
  if (isTop) {
    return { x: TOP_CARD_OFFSET_X, y: TOP_CARD_OFFSET_Y };
  }
  return { x: 0, y: 0 };
}

export function getCardRotationInStack(index: number, totalInStack: number): number {
  if (index <= 1 || index === totalInStack - 1) return 0;
  const sign = index % 2 === 0 ? 1 : -1;
  const base = 0.012;
  const variation = (index * 7) % 11;
  return sign * (base + variation * 0.005);
}

export function getSpreadFactor(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return easeInOutCubic(progress);
}

export function applyStackRotations(stack: Container): void {
  const n = stack.children.length;
  for (let i = 0; i < n; i++) {
    (stack.children[i] as Container).rotation = getCardRotationInStack(i, n);
  }
}

export function applyTopCardSpread(stack: Container, spread: number): void {
  if (stack.children.length === 0) return;
  const n = stack.children.length;
  const topCard = stack.children[n - 1] as Container;
  const pos = getCardPositionInStack(n - 1, n);
  topCard.x = pos.x * spread;
  topCard.y = pos.y * spread;
}
