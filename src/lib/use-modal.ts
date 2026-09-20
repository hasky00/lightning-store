"use client";

import { useEffect, useRef } from "react";

/**
 * Makes a dialog behave like one for people not using a mouse.
 *
 * Four things that are easy to leave out and very obvious when missing:
 * Escape closes it, focus moves into it on open, Tab cannot wander out to the
 * page behind, and focus returns to whatever opened it on close. The last one
 * matters most: without it a keyboard user is dumped back at the top of the
 * document every time they close a dialog.
 */
export function useModal<T extends HTMLElement>(
  onClose: () => void,
  /**
   * False while the dialog is not rendered. Without this the effect would not
   * re-run when a dialog that stays mounted is opened, and the trap would
   * never arm.
   */
  enabled = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Prefer the first real control; fall back to the dialog itself so focus
    // never stays on the page behind.
    const first = focusable()[0];
    if (first) first.focus();
    else container.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // The page behind must not scroll while a dialog is over it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose, enabled]);

  return ref;
}
