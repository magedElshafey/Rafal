const HOVER_INTENT_MS = 125;
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/** Listen to the stretched link itself, never its sibling wishlist control. */
export function observeProductImageIntent(
  link: HTMLAnchorElement,
  onIntent: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let accepted = false;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }

  function cleanup() {
    cancel();
    link.removeEventListener("pointerenter", enter);
    link.removeEventListener("pointerleave", cancel);
    link.removeEventListener("pointerdown", cancel);
    link.removeEventListener("pointercancel", cancel);
    link.removeEventListener("focus", focus);
    link.removeEventListener("blur", cancel);
  }

  function accept() {
    if (accepted) return;
    accepted = true;
    cleanup();
    onIntent();
  }

  function enter(event: PointerEvent) {
    if (
      accepted ||
      event.pointerType === "touch" ||
      event.buttons !== 0 ||
      !window.matchMedia(HOVER_QUERY).matches
    ) return;

    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      // Recheck capability and hit target after the dwell, including overlays.
      if (window.matchMedia(HOVER_QUERY).matches && link.matches(":hover")) {
        accept();
      }
    }, HOVER_INTENT_MS);
  }

  function focus() {
    if (link.matches(":focus-visible")) accept();
  }

  link.addEventListener("pointerenter", enter);
  link.addEventListener("pointerleave", cancel);
  link.addEventListener("pointerdown", cancel);
  link.addEventListener("pointercancel", cancel);
  link.addEventListener("focus", focus);
  link.addEventListener("blur", cancel);

  // Preserve deliberate keyboard intent that arrived before hydration.
  if (link.matches(":focus-visible")) focus();

  return cleanup;
}
