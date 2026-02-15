import { Container, Text } from "pixi.js";
import { HEADER_Z_INDEX } from "@/constants";

const FPS_UPDATE_INTERVAL_MS = 200;

export interface FpsDisplay {
  container: Container;
  /** Call each frame to update the FPS text. */
  update(): void;
}

export function createFpsDisplay(): FpsDisplay {
  const container = new Container();
  container.eventMode = "none";
  container.label = "fps";

  const text = new Text({
    text: "60 FPS",
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 14,
      fill: 0x88ff88,
      fontWeight: "600",
    },
    resolution: Math.max(2, window.devicePixelRatio || 2),
  });
  text.anchor.set(0, 0);
  text.x = 12;
  text.y = 12;
  text.zIndex = HEADER_Z_INDEX;
  container.addChild(text);

  let lastTime = 0;
  let frameCount = 0;
  let lastFpsUpdate = 0;

  function update(): void {
    const now = performance.now();
    if (lastTime > 0) frameCount++;
    lastTime = now;
    if (lastFpsUpdate === 0) lastFpsUpdate = now;
    if (now - lastFpsUpdate >= FPS_UPDATE_INTERVAL_MS) {
      const elapsedSec = (now - lastFpsUpdate) / 1000;
      const fps = elapsedSec > 0 ? Math.round(frameCount / elapsedSec) : 60;
      text.text = `${Math.min(99, fps)} FPS`;
      frameCount = 0;
      lastFpsUpdate = now;
    }
  }

  return { container, update };
}
