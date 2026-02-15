import { Container, Graphics, Text, Rectangle } from "pixi.js";

const PAD = 14;
const W = 100;
const H = 40;
const SLOT_OFFSET_RIGHT = 14 + 14;

export const BACK_BUTTON_A11Y_STYLE = {
  position: "fixed" as const,
  top: `${PAD}px`,
  right: `${SLOT_OFFSET_RIGHT}px`,
  width: `${W}px`,
  height: `${H}px`,
  zIndex: 1000,
  margin: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  opacity: 0,
  overflow: "hidden",
  clipPath: "inset(0 0 0 0)",
};

export interface BackButtonResult {
  container: Container;
  a11yElement: HTMLButtonElement;
}

export function createBackButton(onBack: () => void): BackButtonResult {
  const btn = new Container();
  btn.eventMode = "static";
  btn.hitArea = new Rectangle(0, PAD, W, H);
  btn.cursor = "pointer";
  btn.on("pointerdown", onBack);
  const hit = new Graphics();
  hit.roundRect(0, PAD, W, H, 8);
  hit.fill(0x2a2535, 0.9);
  hit.stroke({ width: 1.5, color: 0x5a5070 });
  hit.eventMode = "none";
  btn.addChild(hit);
  const backText = new Text({
    text: "← Menu",
    style: {
      fontFamily: "system-ui",
      fontSize: 14,
      fill: 0xc0b0a0,
      fontWeight: "600",
    },
  });
  backText.anchor.set(0.5, 0.5);
  backText.x = W / 2;
  backText.y = PAD + H / 2;
  btn.addChild(backText);

  const a11y = document.createElement("button");
  a11y.type = "button";
  a11y.setAttribute("role", "button");
  a11y.setAttribute("aria-label", "Back to menu");
  Object.assign(a11y.style, BACK_BUTTON_A11Y_STYLE);
  a11y.addEventListener("click", (e) => {
    e.preventDefault();
    onBack();
  });

  return { container: btn, a11yElement: a11y };
}
