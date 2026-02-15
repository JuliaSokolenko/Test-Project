/**
 * Shows the purple overlay on pagehide/visibilitychange so the tab snapshot
 * stays purple instead of the game's two-tone screen.
 */
export function initReloadOverlay(): void {
  const el = document.getElementById("reload-overlay");
  if (!el) return;
  const overlay = el;

  function show(): void {
    overlay.style.setProperty("display", "block", "important");
  }

  window.addEventListener("pagehide", show);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") show();
  });
}
