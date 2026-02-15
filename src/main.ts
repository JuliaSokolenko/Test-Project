import { GameEngine } from "@/core/GameEngine";
import { APP_LOADING_Z_INDEX, RELOAD_OVERLAY_Z_INDEX } from "@/constants";
import { initReloadOverlay } from "@/utils/reload-overlay";

initReloadOverlay();

function showFatalError(message: string): void {
  const loading = document.getElementById("app-loading");
  if (loading) loading.classList.add("app-loading--hide");

  const existing = document.getElementById("app-error");
  if (existing) return;

  const wrap = document.createElement("div");
  wrap.id = "app-error";
  wrap.setAttribute("role", "alert");
  wrap.style.cssText =
    "position:fixed;inset:0;background:#1a1628;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;z-index:99998;";
  const text = document.createElement("p");
  text.style.cssText =
    "color:rgba(232,224,208,0.95);font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;text-align:center;max-width:360px;margin:0;";
  text.textContent = message;
  wrap.appendChild(text);
  document.body.appendChild(wrap);
}

async function main(): Promise<void> {
  document.documentElement.style.setProperty("--app-loading-z-index", String(APP_LOADING_Z_INDEX));
  document.documentElement.style.setProperty(
    "--reload-overlay-z-index",
    String(RELOAD_OVERLAY_Z_INDEX)
  );
  const engine = new GameEngine();
  await engine.run();
}

main().catch((err) => {
  console.error("Failed to start application:", err);
  const message = err instanceof Error ? err.message : String(err);
  showFatalError("Something went wrong. Please refresh the page.\n\n" + message);
});
